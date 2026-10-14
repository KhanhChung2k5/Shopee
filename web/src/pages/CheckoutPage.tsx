import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import { formatVnd } from '../lib/catalog'
import { apiFetch, ApiError } from '../lib/api'
import type { AvailableVoucher, VoucherQuote } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'
import { useCart } from '../state/CartContext'

interface Address { id: string; recipientName: string; phone: string; fullAddress: string; isDefault: boolean }
interface CreatedOrder { id: string; discountAmount: number; totalAmount: number }

export default function CheckoutPage() {
  const { token, isAuthenticated, isReady } = useAuth()
  if (!isReady) return <div className="container"><div className="cart-empty">Đang kiểm tra đăng nhập…</div></div>
  if (!isAuthenticated || !token) return <Navigate to="/dang-nhap" replace state={{ from: '/thanh-toan' }} />
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
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([])
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [draftVoucherCode, setDraftVoucherCode] = useState('')
  const [quoteResult, setQuoteResult] = useState<{ key: string; quote?: VoucherQuote; error?: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Address[]>('/addresses', { signal: controller.signal }, token)
      .then((data) => { setAddresses(data); setAddressId((data.find((address) => address.isDefault) ?? data[0])?.id ?? null) })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof ApiError ? reason.message : 'Không tải được địa chỉ giao hàng') })
      .finally(() => setIsAddressLoading(false))
    return () => controller.abort()
  }, [token])

  const selectedLines = lines.filter((line) => line.isSelected && line.available)
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const quoteKey = `${voucherCode}:${subtotal}`
  const currentQuote = quoteResult?.key === quoteKey ? quoteResult.quote : undefined
  const quoteError = quoteResult?.key === quoteKey ? quoteResult.error : undefined
  const quoting = !!voucherCode && subtotal > 0 && quoteResult?.key !== quoteKey
  const discountAmount = Number(currentQuote?.discountAmount ?? 0)
  const totalAmount = Math.max(0, subtotal - discountAmount)

  useEffect(() => {
    const controller = new AbortController()
    setVoucherLoading(true)
    apiFetch<AvailableVoucher[]>('/vouchers', { signal: controller.signal }, token)
      .then(setAvailableVouchers)
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setVoucherError(reason instanceof ApiError ? reason.message : 'Không tải được voucher') })
      .finally(() => { if (!controller.signal.aborted) setVoucherLoading(false) })
    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!voucherCode || subtotal <= 0) return
    const controller = new AbortController()
    apiFetch<VoucherQuote>('/vouchers/quote', { method: 'POST', signal: controller.signal, body: JSON.stringify({ code: voucherCode, subtotal }) }, token)
      .then((quote) => setQuoteResult({ key: quoteKey, quote }))
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setQuoteResult({ key: quoteKey, error: reason instanceof ApiError ? reason.message : 'Không báo giá được voucher' }) })
    return () => controller.abort()
  }, [quoteKey, subtotal, token, voucherCode])

  const placeOrder = async () => {
    if (!addressId || selectedLines.length === 0 || (voucherCode && !currentQuote)) return
    setIsSubmitting(true); setError(null)
    try {
      const request = { addressId, ...(voucherCode ? { voucherCode } : {}) }
      const order = await apiFetch<CreatedOrder>('/orders', { method: 'POST', body: JSON.stringify(request) }, token)
      setCreatedOrder(order); await refreshCart()
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Đặt hàng thất bại, vui lòng thử lại') } finally { setIsSubmitting(false) }
  }

  if (createdOrder) return <div className="container"><div className="checkout-success"><div className="checkout-success__icon" aria-hidden="true">✓</div><h1 className="section-title">Đặt hàng thành công</h1><p>Đơn hàng đã được ghi nhận và đang chờ nhân viên xác nhận.</p><div className="checkout-success__details"><span>Mã đơn</span><strong>{createdOrder.id}</strong>{createdOrder.discountAmount > 0 && <><span>Voucher giảm</span><strong>-{formatVnd(Number(createdOrder.discountAmount))}</strong></>}<span>Tổng thanh toán</span><strong>{formatVnd(Number(createdOrder.totalAmount))}</strong></div><div className="checkout-success__actions"><Link className="button button--outline" to="/gio-hang">Về giỏ hàng</Link><Link className="button button--primary" to={`/don-hang/${createdOrder.id}`}>Xem đơn hàng</Link></div></div></div>
  if (isCartLoading && lines.length === 0) return <div className="container"><div className="cart-empty">Đang tải sản phẩm thanh toán…</div></div>
  if (selectedLines.length === 0) return <div className="container"><div className="cart-empty"><p>Bạn chưa chọn sản phẩm nào để thanh toán.</p><Link className="button button--primary" to="/gio-hang">Quay lại giỏ hàng</Link></div></div>

  const cannotSubmit = isSubmitting || isAddressLoading || !addressId || (!!voucherCode && !currentQuote)
  return <><div className="container"><div className="checkout-page"><div><h1 className="section-title">Xác nhận đơn hàng</h1>{error && <p className="checkout-notice checkout-notice--error" role="alert">{error}</p>}
    <section className="checkout-section"><p className="checkout-section__title"><span>Địa chỉ giao hàng</span><Link className="checkout-section__link" to="/ho-so">Quản lý địa chỉ</Link></p>{isAddressLoading && <p className="checkout-muted">Đang tải địa chỉ…</p>}{!isAddressLoading && addresses.length === 0 && <div className="checkout-empty-address"><p>Bạn chưa có địa chỉ giao hàng.</p><Link className="button button--outline" to="/ho-so">Thêm địa chỉ</Link></div>}{addresses.map((address) => <label key={address.id} className={`radio-card${addressId === address.id ? ' radio-card--selected' : ''}`}><input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} /><span><span className="radio-card__title">{address.recipientName} · {address.phone}{address.isDefault && <span className="checkout-default-badge">Mặc định</span>}</span><span className="radio-card__desc checkout-address-text">{address.fullAddress}</span></span></label>)}</section>
    <section className="checkout-section"><p className="checkout-section__title"><span>Voucher</span><button className="checkout-section__link checkout-section__link-button" type="button" disabled={voucherLoading || availableVouchers.length === 0} onClick={() => { setDraftVoucherCode(voucherCode); setIsVoucherModalOpen(true) }}>Chọn Voucher</button></p><div className="checkout-voucher-selection"><div><strong>{voucherCode ? `Mã ${voucherCode}` : 'Chưa chọn voucher'}</strong><span>{voucherLoading ? 'Đang tải voucher…' : voucherError ?? (availableVouchers.length === 0 ? 'Hiện chưa có voucher khả dụng.' : 'Có thể chọn một voucher giảm giá cho đơn hàng.')}</span>{quoting && <span>Đang kiểm tra mức giảm…</span>}{quoteError && <span role="alert" style={{ color: 'var(--color-urgent)' }}>{quoteError}</span>}</div>{discountAmount > 0 && <strong className="checkout-discount">-{formatVnd(discountAmount)}</strong>}</div></section>
    <section className="checkout-section"><p className="checkout-section__title">Phương thức thanh toán</p><label className="radio-card radio-card--selected"><input type="radio" name="payment" checked readOnly /><span><span className="radio-card__title">Thanh toán khi nhận hàng</span><span className="radio-card__desc checkout-address-text">Bạn thanh toán cho đơn vị vận chuyển khi nhận được hàng.</span></span></label></section>
    <section className="checkout-section"><p className="checkout-section__title">Sản phẩm đã chọn ({selectedLines.length})</p>{selectedLines.map((line) => <div className="checkout-line" key={line.id}><div className="checkout-line__media"><ProductThumb seed={line.product.thumbSeed} productType={line.product.productType} imageUrl={line.product.imageUrl} /></div><div className="checkout-line__body"><p className="checkout-line__name">{line.product.name}</p><p className="checkout-line__qty">Số lượng: {line.quantity}</p></div><strong className="checkout-line__total">{formatVnd(line.product.price * line.quantity)}</strong></div>)}</section>
  </div><aside className="cart-summary"><div className="cart-summary__row"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div><div className="cart-summary__row"><span>Giảm giá</span><span className={discountAmount > 0 ? 'checkout-discount' : undefined}>{discountAmount > 0 ? `-${formatVnd(discountAmount)}` : formatVnd(0)}</span></div><div className="cart-summary__row"><span>Phí vận chuyển</span><span>{formatVnd(0)}</span></div><div className="cart-summary__row cart-summary__total"><span>Tổng thanh toán</span><span>{formatVnd(totalAmount)}</span></div><button className="button button--primary" type="button" onClick={() => void placeOrder()} disabled={cannotSubmit} style={{ width: '100%', marginTop: 'var(--space-3)' }}>{isSubmitting ? 'Đang tạo đơn…' : 'Đặt hàng'}</button><p className="checkout-summary-note">Giá cuối cùng được backend xác nhận tại thời điểm tạo đơn.</p></aside></div></div>
  {isVoucherModalOpen && <div className="voucher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsVoucherModalOpen(false) }}><section className="voucher-modal" role="dialog" aria-modal="true" aria-labelledby="voucher-modal-title"><header className="voucher-modal__header"><div><p>Chợ Tốt Mua Voucher</p><h2 id="voucher-modal-title">Chọn Voucher</h2></div><button type="button" aria-label="Đóng cửa sổ chọn voucher" onClick={() => setIsVoucherModalOpen(false)}>×</button></header><div className="voucher-modal__body"><p className="voucher-modal__hint">Chọn một voucher. Mức giảm được backend kiểm tra theo giá trị đơn hàng hiện tại.</p>{availableVouchers.map((voucher) => <label key={voucher.id} className={`radio-card voucher-option${draftVoucherCode === voucher.code ? ' radio-card--selected' : ''}`}><input type="radio" name="voucher" checked={draftVoucherCode === voucher.code} onChange={() => setDraftVoucherCode(voucher.code)} /><span className="voucher-option__ticket">{voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}</span><span className="voucher-option__body"><span className="radio-card__title">{voucher.programName}</span><span className="radio-card__desc checkout-address-text">Mã: {voucher.code} · Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</span></span></label>)}</div><footer className="voucher-modal__footer"><button className="button button--outline" type="button" onClick={() => setDraftVoucherCode('')}>Bỏ chọn voucher</button><div><button className="button button--outline" type="button" onClick={() => setIsVoucherModalOpen(false)}>Trở lại</button><button className="button button--primary" type="button" onClick={() => { setVoucherCode(draftVoucherCode); setIsVoucherModalOpen(false) }}>Đồng ý</button></div></footer></section></div>}</>
}
