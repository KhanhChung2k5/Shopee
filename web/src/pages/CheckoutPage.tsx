import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import { calculateVoucherBundleDiscount, calculateVoucherDiscount, formatVnd, VOUCHERS, type VoucherOffer } from '../data/sampleProducts'
import { PAYMENT_METHODS } from '../data/sampleAddresses'
import { isP3DemoMode } from '../demo/p3DemoApi'
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from '../state/AuthContext'
import { useCart } from '../state/CartContext'

interface Address {
  id: string
  recipientName: string
  phone: string
  fullAddress: string
  isDefault: boolean
}

interface CreatedOrder {
  id: string
  shippingAddressSnapshot: string
  subtotalAmount: number
  discountAmount: number
  shippingFeeAmount: number
  totalAmount: number
  status: string
  createdAt: string
}

export default function CheckoutPage() {
  const { token, isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return <div className="container"><div className="cart-empty">Đang kiểm tra đăng nhập…</div></div>
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/dang-nhap" replace state={{ from: '/thanh-toan' }} />
  }

  return <CheckoutContent token={token} />
}

function CheckoutContent({ token }: { token: string }) {
  const { lines, isLoading: isCartLoading, refreshCart } = useCart()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<string | null>(null)
  const [isAddressLoading, setIsAddressLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [voucherIds, setVoucherIds] = useState<string[]>([])
  const [draftVoucherIds, setDraftVoucherIds] = useState<string[]>([])
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Address[]>('/addresses', { signal: controller.signal }, token)
      .then((data) => {
        setAddresses(data)
        const preferred = data.find((address) => address.isDefault) ?? data[0]
        setAddressId(preferred?.id ?? null)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof ApiError ? requestError.message : 'Không tải được địa chỉ giao hàng')
      })
      .finally(() => setIsAddressLoading(false))

    return () => controller.abort()
  }, [token])

  const selectedLines = lines.filter((line) => line.isSelected && line.available)
  const hasSampleLines = selectedLines.some((line) => line.source === 'sample')
  const apiLines = selectedLines.filter((line) => line.source === 'api')
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const demoMode = isP3DemoMode()
  const shippingFee = demoMode ? 30_000 : 0
  const selectedVouchers = VOUCHERS.filter((voucher) => voucherIds.includes(voucher.id))
  const discountAmount = calculateVoucherBundleDiscount(selectedVouchers, subtotal, shippingFee)
  const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount)
  const draftVouchers = VOUCHERS.filter((voucher) => draftVoucherIds.includes(voucher.id))
  const draftDiscountAmount = calculateVoucherBundleDiscount(draftVouchers, subtotal, shippingFee)
  const shippingVouchers = VOUCHERS.filter((voucher) => voucher.discountType === 'shipping')
  const productVouchers = VOUCHERS.filter((voucher) => voucher.discountType !== 'shipping')

  const openVoucherModal = () => {
    setDraftVoucherIds([...voucherIds])
    setIsVoucherModalOpen(true)
  }

  const closeVoucherModal = () => setIsVoucherModalOpen(false)

  const applyVoucher = () => {
    setVoucherIds([...draftVoucherIds])
    setIsVoucherModalOpen(false)
  }

  const toggleDraftVoucher = (voucher: VoucherOffer) => {
    setDraftVoucherIds((current) => {
      if (current.includes(voucher.id)) return current.filter((id) => id !== voucher.id)
      const isShipping = voucher.discountType === 'shipping'
      const withoutSameType = current.filter((id) => {
        const selected = VOUCHERS.find((entry) => entry.id === id)
        return selected ? (selected.discountType === 'shipping') !== isShipping : false
      })
      return [...withoutSameType, voucher.id]
    })
  }

  const renderVoucherOption = (voucher: VoucherOffer) => {
    const eligible = subtotal >= voucher.minOrderValue
    const saving = calculateVoucherDiscount(voucher, subtotal, shippingFee)
    const isShipping = voucher.discountType === 'shipping'
    return (
      <label key={voucher.id} className={`radio-card voucher-option${draftVoucherIds.includes(voucher.id) ? ' radio-card--selected' : ''}${eligible ? '' : ' radio-card--disabled'}`}>
        <input
          type="checkbox"
          checked={draftVoucherIds.includes(voucher.id)}
          disabled={!eligible}
          onChange={() => toggleDraftVoucher(voucher)}
        />
        <span className={`voucher-option__ticket${isShipping ? ' voucher-option__ticket--shipping' : ''}`} aria-hidden="true">
          {isShipping ? (
            <>
              <svg width="31" height="31" viewBox="0 0 24 24" fill="none"><path d="M3 6.5h11v10H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 10h4l3 3v3.5h-7V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="7" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.5" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.7" /></svg>
              <small>Freeship</small>
            </>
          ) : voucher.amountLabel}
        </span>
        <span className="voucher-option__body">
          <span className="radio-card__title">{voucher.title}</span>
          <span className="radio-card__desc checkout-address-text">{voucher.conditionLabel} · {voucher.expiryLabel}</span>
          <span className="voucher-option__saving">
            {!eligible
              ? `Cần thêm ${formatVnd(voucher.minOrderValue - subtotal)} để sử dụng`
              : saving > 0 ? `Tiết kiệm ${formatVnd(saving)}` : 'Đơn hiện được miễn phí vận chuyển'}
          </span>
        </span>
      </label>
    )
  }

  const handlePlaceOrder = async () => {
    if (!addressId || hasSampleLines || apiLines.length === 0) return

    setIsSubmitting(true)
    setError(null)
    try {
      const requestBody: { addressId: string; voucherIds?: string[] } = { addressId }
      if (demoMode && voucherIds.length > 0) requestBody.voucherIds = voucherIds
      const order = await apiFetch<CreatedOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }, token)
      setCreatedOrder(order)
      await refreshCart()
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Đặt hàng thất bại, vui lòng thử lại')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdOrder) {
    return (
      <div className="container">
        <div className="checkout-success">
          <div className="checkout-success__icon" aria-hidden="true">✓</div>
          <h1 className="section-title">Đặt hàng thành công</h1>
          <p>Đơn hàng đã được ghi nhận và đang chờ nhân viên xác nhận.</p>
          <div className="checkout-success__details">
            <span>Mã đơn</span>
            <strong>{createdOrder.id}</strong>
            <span>Trạng thái</span>
            <strong>Chờ xác nhận</strong>
            {createdOrder.discountAmount > 0 && <><span>Voucher giảm</span><strong>-{formatVnd(Number(createdOrder.discountAmount))}</strong></>}
            <span>Tổng thanh toán</span>
            <strong>{formatVnd(Number(createdOrder.totalAmount))}</strong>
          </div>
          <div className="checkout-success__actions">
            <Link className="button button--outline" to="/gio-hang">Về giỏ hàng</Link>
            <Link className="button button--primary" to={`/don-hang/${createdOrder.id}`}>Xem đơn hàng</Link>
          </div>
        </div>
      </div>
    )
  }

  if (isCartLoading && lines.length === 0) {
    return <div className="container"><div className="cart-empty">Đang tải sản phẩm thanh toán…</div></div>
  }

  if (selectedLines.length === 0) {
    return (
      <div className="container">
        <div className="cart-empty">
          <p>Bạn chưa chọn sản phẩm nào để thanh toán.</p>
          <Link className="button button--primary" to="/gio-hang">Quay lại giỏ hàng</Link>
        </div>
      </div>
    )
  }

  const cannotSubmit = isSubmitting || isAddressLoading || !addressId || hasSampleLines || apiLines.length === 0

  return (
    <>
      <div className="container">
        <div className="checkout-page">
        <div>
          <h1 className="section-title">Xác nhận đơn hàng</h1>

          {error && <p className="checkout-notice checkout-notice--error" role="alert">{error}</p>}
          {hasSampleLines && (
            <div className="checkout-notice checkout-notice--warning">
              <strong>Catalog hiện vẫn là dữ liệu mẫu.</strong>
              <span>
                Sản phẩm mã <code>sp-*</code> chưa có variant UUID trong database nên chưa thể tạo đơn thật.
                Hãy bỏ chọn chúng hoặc dùng sản phẩm từ Catalog API của P2.
              </span>
            </div>
          )}

          <section className="checkout-section">
            <p className="checkout-section__title">
              <span>Địa chỉ giao hàng</span>
              <Link className="checkout-section__link" to="/ho-so">Quản lý địa chỉ</Link>
            </p>
            {isAddressLoading && <p className="checkout-muted">Đang tải địa chỉ…</p>}
            {!isAddressLoading && addresses.length === 0 && (
              <div className="checkout-empty-address">
                <p>Bạn chưa có địa chỉ giao hàng.</p>
                <Link className="button button--outline" to="/ho-so">Thêm địa chỉ</Link>
              </div>
            )}
            {addresses.map((address) => (
              <label key={address.id} className={`radio-card${addressId === address.id ? ' radio-card--selected' : ''}`}>
                <input
                  type="radio"
                  name="address"
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                />
                <span>
                  <span className="radio-card__title">
                    {address.recipientName} · {address.phone}
                    {address.isDefault && <span className="checkout-default-badge">Mặc định</span>}
                  </span>
                  <span className="radio-card__desc checkout-address-text">{address.fullAddress}</span>
                </span>
              </label>
            ))}
          </section>

          <section className="checkout-section">
            <p className="checkout-section__title">
              <span>Voucher</span>
              <button className="checkout-section__link checkout-section__link-button" type="button" disabled={!demoMode} onClick={openVoucherModal}>Chọn Voucher</button>
            </p>
            {!demoMode ? (
              <p className="checkout-muted">Voucher sẽ khả dụng sau khi API của P4 được tích hợp.</p>
            ) : (
              <div className="checkout-voucher-selection">
                <div>
                  <strong>{selectedVouchers.length > 0 ? `Đã chọn ${selectedVouchers.length} voucher` : 'Chưa chọn voucher'}</strong>
                  <span>{selectedVouchers.length > 0 ? selectedVouchers.map((voucher) => voucher.title).join(' + ') : 'Có thể ghép một voucher giảm giá và một voucher vận chuyển.'}</span>
                </div>
                {discountAmount > 0 && <strong className="checkout-discount">-{formatVnd(discountAmount)}</strong>}
              </div>
            )}
          </section>

          <section className="checkout-section">
            <p className="checkout-section__title">Phương thức thanh toán</p>
            {PAYMENT_METHODS.map((method) => {
              const enabled = method.id === 'cod'
              return (
                <label key={method.id} className={`radio-card${enabled ? ' radio-card--selected' : ' radio-card--disabled'}`}>
                  <input type="radio" name="payment" checked={enabled} disabled={!enabled} readOnly />
                  <span>
                    <span className="radio-card__title">
                      {method.title}
                      {!enabled && <span className="checkout-coming-badge">Sắp hỗ trợ</span>}
                    </span>
                    <span className="radio-card__desc checkout-address-text">{method.desc}</span>
                  </span>
                </label>
              )
            })}
          </section>

          <section className="checkout-section">
            <p className="checkout-section__title">Sản phẩm đã chọn ({selectedLines.length})</p>
            {selectedLines.map((line) => (
              <div className="checkout-line" key={line.id}>
                <div className="checkout-line__media">
                  <ProductThumb seed={line.product.thumbSeed} productType={line.product.productType} imageUrl={line.product.imageUrl} />
                </div>
                <div className="checkout-line__body">
                  <p className="checkout-line__name">{line.product.name}</p>
                  <p className="checkout-line__qty">Số lượng: {line.quantity}</p>
                </div>
                <strong className="checkout-line__total">{formatVnd(line.product.price * line.quantity)}</strong>
              </div>
            ))}
          </section>
        </div>

        <aside className="cart-summary">
          <div className="cart-summary__row"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div>
          <div className="cart-summary__row"><span>Giảm giá</span><span className={discountAmount > 0 ? 'checkout-discount' : undefined}>{discountAmount > 0 ? `-${formatVnd(discountAmount)}` : formatVnd(0)}</span></div>
          <div className="cart-summary__row"><span>Phí vận chuyển</span><span>{formatVnd(shippingFee)}</span></div>
          <div className="cart-summary__row cart-summary__total"><span>Tổng thanh toán</span><span>{formatVnd(totalAmount)}</span></div>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void handlePlaceOrder()}
            disabled={cannotSubmit}
            style={{ width: '100%', marginTop: 'var(--space-3)' }}
          >
            {isSubmitting ? 'Đang tạo đơn…' : 'Đặt hàng'}
          </button>
          <p className="checkout-summary-note">Giá cuối cùng được backend xác nhận tại thời điểm tạo đơn.</p>
          </aside>
        </div>
      </div>

      {demoMode && isVoucherModalOpen && (
        <div className="voucher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeVoucherModal() }}>
          <section className="voucher-modal" role="dialog" aria-modal="true" aria-labelledby="voucher-modal-title">
            <header className="voucher-modal__header">
              <div>
                <p>Chợ Tốt Mua Voucher</p>
                <h2 id="voucher-modal-title">Chọn Voucher</h2>
              </div>
              <button type="button" aria-label="Đóng cửa sổ chọn voucher" onClick={closeVoucherModal}>×</button>
            </header>

            <div className="voucher-modal__body">
              <div className="voucher-modal__hint">
                <span>Chọn tối đa 1 voucher giảm giá và 1 voucher vận chuyển.</span>
                {draftVoucherIds.length > 0 && <button type="button" onClick={() => setDraftVoucherIds([])}>Bỏ chọn tất cả</button>}
              </div>

              <section className="voucher-modal__group" aria-labelledby="shipping-vouchers-heading">
                <div className="voucher-modal__group-heading">
                  <div>
                    <h3 id="shipping-vouchers-heading">Mã miễn phí vận chuyển</h3>
                    <span>Có thể chọn 1 voucher</span>
                  </div>
                  <span className="voucher-modal__group-icon voucher-modal__group-icon--shipping" aria-hidden="true">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M3 6.5h11v10H3zM14 10h4l3 3v3.5h-7V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="7" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.5" cy="18.5" r="1.7" stroke="currentColor" strokeWidth="1.7" /></svg>
                  </span>
                </div>
                {shippingVouchers.map(renderVoucherOption)}
              </section>

              <section className="voucher-modal__group" aria-labelledby="product-vouchers-heading">
                <div className="voucher-modal__group-heading">
                  <div>
                    <h3 id="product-vouchers-heading">Mã giảm giá</h3>
                    <span>Có thể chọn 1 voucher</span>
                  </div>
                  <span className="voucher-modal__group-icon" aria-hidden="true">%</span>
                </div>
                {productVouchers.map(renderVoucherOption)}
              </section>
            </div>

            <footer className="voucher-modal__footer">
              <span>{draftVoucherIds.length > 0 ? `${draftVoucherIds.length} voucher · Tiết kiệm ${formatVnd(draftDiscountAmount)}` : 'Chưa chọn voucher'}</span>
              <div>
                <button className="button button--outline" type="button" onClick={closeVoucherModal}>Trở lại</button>
                <button className="button button--primary" type="button" onClick={applyVoucher}>Đồng ý</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
