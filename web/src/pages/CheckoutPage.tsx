import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import { Alert, Badge, Button, ButtonLink, Card, CardTitle, EmptyState, Loading, Modal, Page, PageHeader, RadioCard, SummaryRow } from '../components/ui'
import { formatVnd } from '../lib/catalog'
import { apiFetch, ApiError } from '../lib/api'
import type { AvailableVoucher, VoucherQuote } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'
import { useCart } from '../state/CartContext'

interface Address { id: string; recipientName: string; phone: string; fullAddress: string; isDefault: boolean }
interface CreatedOrder { id: string; discountAmount: number; totalAmount: number }

const PAYMENT_METHODS = [
  ['cod', 'Thanh toán khi nhận hàng', 'Thanh toán cho đơn vị vận chuyển khi nhận hàng.', 'local_shipping'],
  ['bank_transfer', 'Chuyển khoản mô phỏng', 'Xác nhận thanh toán ngay trong môi trường thử nghiệm.', 'account_balance'],
  ['wallet', 'Ví Chợ Tốt Mua', 'Trừ trực tiếp từ số dư ví nếu số dư đủ.', 'account_balance_wallet'],
] as const

export default function CheckoutPage() {
  const { token, isAuthenticated, isReady } = useAuth()
  if (!isReady) return <Page><Loading>Đang kiểm tra đăng nhập…</Loading></Page>
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'wallet'>('cod')
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
      const request = { addressId, paymentMethod, ...(voucherCode ? { voucherCode } : {}) }
      const order = await apiFetch<CreatedOrder>('/orders', { method: 'POST', body: JSON.stringify(request) }, token)
      setCreatedOrder(order); await refreshCart()
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Đặt hàng thất bại, vui lòng thử lại') } finally { setIsSubmitting(false) }
  }

  if (createdOrder) {
    return (
      <Page narrow>
        <Card className="text-center space-y-space-md">
          <span className="mx-auto w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined text-3xl">check</span>
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Đặt hàng thành công</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Đơn hàng đã được ghi nhận và đang chờ nhân viên xác nhận.</p>
          <div className="text-left rounded-lg bg-surface-container-low p-space-md space-y-space-xs">
            <SummaryRow label="Mã đơn" value={<span className="font-mono text-label-md break-all">{createdOrder.id}</span>} />
            {createdOrder.discountAmount > 0 && <SummaryRow label="Voucher giảm" value={<span className="text-secondary">-{formatVnd(Number(createdOrder.discountAmount))}</span>} />}
            <SummaryRow strong label="Tổng thanh toán" value={formatVnd(Number(createdOrder.totalAmount))} />
          </div>
          <div className="flex flex-wrap justify-center gap-space-sm">
            <ButtonLink variant="outline" to="/gio-hang">Về giỏ hàng</ButtonLink>
            <ButtonLink to={`/don-hang/${createdOrder.id}`} icon="receipt_long">Xem đơn hàng</ButtonLink>
          </div>
        </Card>
      </Page>
    )
  }
  if (isCartLoading && lines.length === 0) return <Page><Loading>Đang tải sản phẩm thanh toán…</Loading></Page>
  if (selectedLines.length === 0) {
    return (
      <Page narrow>
        <Card>
          <EmptyState icon="shopping_cart" title="Bạn chưa chọn sản phẩm nào để thanh toán" action={<ButtonLink to="/gio-hang">Quay lại giỏ hàng</ButtonLink>} />
        </Card>
      </Page>
    )
  }

  const cannotSubmit = isSubmitting || isAddressLoading || !addressId || (!!voucherCode && !currentQuote)
  const linkClass = 'font-title-md text-title-md text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed'

  return (
    <>
      <Page>
        <PageHeader breadcrumb={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]} title="Xác nhận đơn hàng" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
          <div className="lg:col-span-8 space-y-space-md">
            {error && <Alert>{error}</Alert>}

            <Card as="section">
              <CardTitle icon="location_on" actions={<Link className={linkClass} to="/ho-so">Quản lý địa chỉ</Link>}>Địa chỉ giao hàng</CardTitle>
              <div className="space-y-space-sm">
                {isAddressLoading && <Loading>Đang tải địa chỉ…</Loading>}
                {!isAddressLoading && addresses.length === 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg border border-dashed border-line p-space-md">
                    <p className="font-body-md text-body-md text-on-surface-variant">Bạn chưa có địa chỉ giao hàng.</p>
                    <ButtonLink variant="outline" size="sm" icon="add" to="/ho-so">Thêm địa chỉ</ButtonLink>
                  </div>
                )}
                {addresses.map((address) => (
                  <RadioCard key={address.id} name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)}>
                    <span className="flex flex-wrap items-center gap-space-xs font-title-md text-title-md text-on-surface">
                      {address.recipientName} · {address.phone}
                      {address.isDefault && <Badge tone="primary">Mặc định</Badge>}
                    </span>
                    <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">{address.fullAddress}</span>
                  </RadioCard>
                ))}
              </div>
            </Card>

            <Card as="section">
              <CardTitle
                icon="confirmation_number"
                actions={<button className={linkClass} type="button" disabled={voucherLoading || availableVouchers.length === 0} onClick={() => { setDraftVoucherCode(voucherCode); setIsVoucherModalOpen(true) }}>Chọn Voucher</button>}
              >
                Voucher
              </CardTitle>
              <div className="flex items-start justify-between gap-space-md rounded-lg bg-surface-container-low p-space-md">
                <div className="space-y-0.5 font-body-md text-body-md text-on-surface-variant">
                  <strong className="block font-title-md text-title-md text-on-surface">{voucherCode ? `Mã ${voucherCode}` : 'Chưa chọn voucher'}</strong>
                  <span className="block">{voucherLoading ? 'Đang tải voucher…' : voucherError ?? (availableVouchers.length === 0 ? 'Hiện chưa có voucher khả dụng.' : 'Có thể chọn một voucher giảm giá cho đơn hàng.')}</span>
                  {quoting && <span className="block">Đang kiểm tra mức giảm…</span>}
                  {quoteError && <span role="alert" className="block text-error">{quoteError}</span>}
                </div>
                {discountAmount > 0 && <strong className="font-price-md text-price-md text-secondary whitespace-nowrap">-{formatVnd(discountAmount)}</strong>}
              </div>
            </Card>

            <Card as="section">
              <CardTitle icon="payments">Phương thức thanh toán</CardTitle>
              <div className="space-y-space-sm">
                {PAYMENT_METHODS.map(([value, title, description, icon]) => (
                  <RadioCard key={value} name="payment" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} aside={<span className="material-symbols-outlined text-on-surface-variant">{icon}</span>}>
                    <span className="block font-title-md text-title-md text-on-surface">{title}</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">{description}</span>
                  </RadioCard>
                ))}
              </div>
            </Card>

            <Card as="section">
              <CardTitle icon="inventory_2">Sản phẩm đã chọn ({selectedLines.length})</CardTitle>
              <div className="divide-y divide-line">
                {selectedLines.map((line) => (
                  <div className="flex items-center gap-space-md py-space-sm" key={line.id}>
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-low">
                      <ProductThumb seed={line.product.thumbSeed} productType={line.product.productType} imageUrl={line.product.imageUrl} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-title-md text-title-md text-on-surface line-clamp-2">{line.product.name}</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">Số lượng: {line.quantity}</p>
                    </div>
                    <strong className="font-price-md text-price-md text-on-surface whitespace-nowrap">{formatVnd(line.product.price * line.quantity)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card as="aside" className="lg:col-span-4 lg:sticky lg:top-44 space-y-space-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface">Thanh toán</h2>
            <SummaryRow label="Tạm tính" value={formatVnd(subtotal)} />
            <SummaryRow label="Giảm giá" value={<span className={discountAmount > 0 ? 'text-secondary' : undefined}>{discountAmount > 0 ? `-${formatVnd(discountAmount)}` : formatVnd(0)}</span>} />
            <SummaryRow label="Phí vận chuyển" value={formatVnd(0)} />
            <SummaryRow strong label="Tổng thanh toán" value={formatVnd(totalAmount)} />
            <Button size="lg" className="w-full mt-space-sm" icon="check_circle" onClick={() => void placeOrder()} disabled={cannotSubmit}>
              {isSubmitting ? 'Đang tạo đơn…' : 'Đặt hàng'}
            </Button>
            <p className="font-label-md text-label-md text-on-surface-variant text-center">Giá cuối cùng được backend xác nhận tại thời điểm tạo đơn.</p>
          </Card>
        </div>
      </Page>

      {isVoucherModalOpen && (
        <Modal
          eyebrow="Chợ Tốt Mua Voucher"
          title="Chọn Voucher"
          onClose={() => setIsVoucherModalOpen(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setDraftVoucherCode('')}>Bỏ chọn voucher</Button>
            <div className="flex gap-space-sm">
              <Button variant="outline" onClick={() => setIsVoucherModalOpen(false)}>Trở lại</Button>
              <Button onClick={() => { setVoucherCode(draftVoucherCode); setIsVoucherModalOpen(false) }}>Đồng ý</Button>
            </div>
          </>}
        >
          <p className="font-body-md text-body-md text-on-surface-variant">Chọn một voucher. Mức giảm được backend kiểm tra theo giá trị đơn hàng hiện tại.</p>
          {availableVouchers.map((voucher) => (
            <RadioCard
              key={voucher.id}
              name="voucher"
              checked={draftVoucherCode === voucher.code}
              onChange={() => setDraftVoucherCode(voucher.code)}
              aside={<span className="self-center rounded-lg bg-primary text-on-primary px-space-sm py-space-xs font-title-md text-title-md whitespace-nowrap">
                {voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}
              </span>}
            >
              <span className="block font-title-md text-title-md text-on-surface">{voucher.programName}</span>
              <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">Mã: {voucher.code} · Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</span>
            </RadioCard>
          ))}
        </Modal>
      )}
    </>
  )
}
