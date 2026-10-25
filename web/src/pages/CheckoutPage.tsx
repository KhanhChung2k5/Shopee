import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Loading,
  Modal,
  Page,
  PageHeader,
  RadioCard,
  SummaryRow,
  inputClass,
} from '../components/ui'
import { formatVnd } from '../lib/catalog'
import { apiFetch, ApiError } from '../lib/api'
import { type AvailableVoucher, voucherScopeLabel } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'
import { useCart } from '../state/CartContext'

interface Address {
  id: string
  recipientName: string
  phone: string
  fullAddress: string
  isDefault: boolean
}

/** Server-side pricing of the selected cart (POST /orders/preview) — the same numbers POST /orders will charge. */
interface OrderPreview {
  lines: PreviewLine[]
  subtotal: number
  invoiceDiscount: number
  invoiceProgramName: string | null
  voucherCode: string | null
  voucherDiscount: number
  voucherError: string | null
  shippingFee: number
  total: number
}

interface PreviewLine {
  cartItemId: string
  quantity: number
  listPrice: number
  unitPrice: number
  lineTotal: number
  promotionKind: 'flash' | 'percent' | null
  promotionProgramName: string | null
}

interface CreatedOrder {
  id: string
  discountAmount: number
  totalAmount: number
  paymentMethod: 'cod' | 'bank_transfer'
}

const PAYMENT_METHODS = [
  ['cod', 'Thanh toán khi nhận hàng (COD)', 'Thanh toán bằng tiền mặt cho đơn vị vận chuyển khi nhận hàng.', 'local_shipping'],
  ['bank_transfer', 'Chuyển khoản ngân hàng qua mã QR', 'Quét mã VietQR tự động điền số tiền và nội dung đơn hàng.', 'qr_code_2'],
] as const

const EMPTY_ADDRESS_FORM = {
  recipientName: '',
  phone: '',
  fullAddress: '',
  isDefault: false,
}

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

  // Voucher modal state
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([])
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
  const [draftVoucherCode, setDraftVoucherCode] = useState('')
  const [previewResult, setPreviewResult] = useState<{ key: string; preview?: OrderPreview; error?: string } | null>(null)

  // New Address modal state
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false)
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM)
  const [addressFormError, setAddressFormError] = useState<string | null>(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // Order Confirmation modal state
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Address[]>('/addresses', { signal: controller.signal }, token)
      .then((data) => {
        setAddresses(data)
        setAddressId((data.find((address) => address.isDefault) ?? data[0])?.id ?? null)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof ApiError ? reason.message : 'Không tải được địa chỉ giao hàng')
        }
      })
      .finally(() => setIsAddressLoading(false))
    return () => controller.abort()
  }, [token])

  const selectedLines = lines.filter((line) => line.isSelected && line.available)
  // Re-price on the server whenever the selection, a quantity or the voucher changes.
  const previewKey = `${voucherCode}:${selectedLines.map((line) => `${line.id}x${line.quantity}`).join(',')}`
  const preview = previewResult?.key === previewKey ? previewResult.preview : undefined
  const previewError = previewResult?.key === previewKey ? previewResult.error : undefined
  const pricing = selectedLines.length > 0 && previewResult?.key !== previewKey
  const previewLine = (cartItemId: string) => preview?.lines.find((line) => line.cartItemId === cartItemId)
  const subtotal = Number(preview?.subtotal ?? 0)
  const invoiceDiscount = Number(preview?.invoiceDiscount ?? 0)
  const voucherDiscount = Number(preview?.voucherDiscount ?? 0)
  const voucherProblem = voucherCode ? (preview?.voucherError ?? undefined) : undefined
  const totalAmount = Number(preview?.total ?? 0)

  const selectedAddress = addresses.find((a) => a.id === addressId)
  const selectedPaymentMethod = PAYMENT_METHODS.find(([val]) => val === paymentMethod)

  useEffect(() => {
    const controller = new AbortController()
    setVoucherLoading(true)
    apiFetch<AvailableVoucher[]>('/vouchers', { signal: controller.signal }, token)
      .then(setAvailableVouchers)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setVoucherError(reason instanceof ApiError ? reason.message : 'Không tải được voucher')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setVoucherLoading(false)
      })
    return () => controller.abort()
  }, [token])

  const hasSelection = selectedLines.length > 0
  useEffect(() => {
    if (!hasSelection) return
    const controller = new AbortController()
    apiFetch<OrderPreview>(
      '/orders/preview',
      { method: 'POST', signal: controller.signal, body: JSON.stringify(voucherCode ? { voucherCode } : {}) },
      token
    )
      .then((result) => setPreviewResult({ key: previewKey, preview: result }))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setPreviewResult({ key: previewKey, error: reason instanceof ApiError ? reason.message : 'Không tính được giá đơn hàng' })
        }
      })
    return () => controller.abort()
  }, [hasSelection, previewKey, token, voucherCode])

  // Handle adding new address directly on Checkout
  const handleSaveNewAddress = async (e: FormEvent) => {
    e.preventDefault()
    setAddressFormError(null)

    if (!addressForm.recipientName.trim()) {
      setAddressFormError('Vui lòng nhập họ và tên người nhận')
      return
    }
    if (!addressForm.phone.trim()) {
      setAddressFormError('Vui lòng nhập số điện thoại')
      return
    }
    if (!addressForm.fullAddress.trim()) {
      setAddressFormError('Vui lòng nhập địa chỉ nhận hàng chi tiết')
      return
    }

    setIsSavingAddress(true)
    try {
      const newAddress = await apiFetch<Address>(
        '/addresses',
        {
          method: 'POST',
          body: JSON.stringify({
            recipientName: addressForm.recipientName.trim(),
            phone: addressForm.phone.trim(),
            fullAddress: addressForm.fullAddress.trim(),
            isDefault: addressForm.isDefault,
          }),
        },
        token
      )

      setAddresses((prev) => {
        if (newAddress.isDefault) {
          return [newAddress, ...prev.map((a) => ({ ...a, isDefault: false }))]
        }
        return [newAddress, ...prev]
      })
      setAddressId(newAddress.id)
      setAddressForm(EMPTY_ADDRESS_FORM)
      setIsAddAddressModalOpen(false)
    } catch (reason) {
      setAddressFormError(reason instanceof ApiError ? reason.message : 'Thêm địa chỉ thất bại, vui lòng thử lại')
    } finally {
      setIsSavingAddress(false)
    }
  }

  // Handle clicking initial "Đặt hàng" -> Open confirmation modal
  const handleOpenConfirmModal = () => {
    setError(null)
    if (!addressId || !selectedAddress) {
      setError('Vui lòng chọn hoặc thêm địa chỉ giao hàng trước khi đặt hàng')
      return
    }
    if (selectedLines.length === 0) {
      setError('Không có sản phẩm nào được chọn')
      return
    }
    setIsConfirmOrderModalOpen(true)
  }

  // Handle final order submission from confirmation modal
  const handleFinalConfirmOrder = async () => {
    if (!addressId || selectedLines.length === 0 || !preview || voucherProblem) return
    setIsSubmitting(true)
    setError(null)
    try {
      const request = { addressId, paymentMethod, ...(voucherCode ? { voucherCode } : {}) }
      const order = await apiFetch<Omit<CreatedOrder, 'paymentMethod'>>('/orders', { method: 'POST', body: JSON.stringify(request) }, token)
      setIsConfirmOrderModalOpen(false)
      setCreatedOrder({ ...order, paymentMethod })
      await refreshCart()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Đặt hàng thất bại, vui lòng thử lại')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdOrder) {
    if (createdOrder.paymentMethod === 'bank_transfer') {
      return <BankTransferQRView order={createdOrder} />
    }

    return (
      <Page narrow>
        <Card className="text-center space-y-space-md">
          <span
            className="mx-auto w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-3xl">check</span>
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Đặt hàng thành công</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Đơn hàng đã được ghi nhận. Quý khách vui lòng chuẩn bị tiền mặt thanh toán khi nhận hàng (COD).
          </p>
          <div className="text-left rounded-lg bg-surface-container-low p-space-md space-y-space-xs">
            <SummaryRow label="Mã đơn" value={<span className="font-mono text-label-md break-all">{createdOrder.id}</span>} />
            <SummaryRow label="Phương thức" value="Thanh toán khi nhận hàng (COD)" />
            {createdOrder.discountAmount > 0 && (
              <SummaryRow
                label="Giảm giá"
                value={<span className="text-secondary">-{formatVnd(Number(createdOrder.discountAmount))}</span>}
              />
            )}
            <SummaryRow strong label="Tổng thanh toán" value={formatVnd(Number(createdOrder.totalAmount))} />
          </div>
          <div className="flex flex-wrap justify-center gap-space-sm">
            <ButtonLink variant="outline" to="/gio-hang">
              Về giỏ hàng
            </ButtonLink>
            <ButtonLink to={`/don-hang/${createdOrder.id}`} icon="receipt_long">
              Xem đơn hàng
            </ButtonLink>
          </div>
        </Card>
      </Page>
    )
  }

  if (isCartLoading && lines.length === 0) {
    return (
      <Page>
        <Loading>Đang tải sản phẩm thanh toán…</Loading>
      </Page>
    )
  }

  if (selectedLines.length === 0) {
    return (
      <Page narrow>
        <Card>
          <EmptyState
            icon="shopping_cart"
            title="Bạn chưa chọn sản phẩm nào để thanh toán"
            action={<ButtonLink to="/gio-hang">Quay lại giỏ hàng</ButtonLink>}
          />
        </Card>
      </Page>
    )
  }

  const cannotSubmit = isSubmitting || isAddressLoading || !addressId || !preview || !!voucherProblem
  const linkClass =
    'font-title-md text-title-md text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed'

  return (
    <>
      <Page>
        <PageHeader breadcrumb={[{ label: 'Giỏ hàng', to: '/gio-hang' }, { label: 'Thanh toán' }]} title="Xác nhận đơn hàng" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
          <div className="lg:col-span-8 space-y-space-md">
            {error && <Alert>{error}</Alert>}

            {/* Address Card */}
            <Card as="section">
              <CardTitle
                icon="location_on"
                actions={
                  <div className="flex items-center gap-space-md">
                    <button
                      type="button"
                      className="font-title-md text-title-md text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                      onClick={() => {
                        setAddressFormError(null)
                        setAddressForm(EMPTY_ADDRESS_FORM)
                        setIsAddAddressModalOpen(true)
                      }}
                    >
                      <span className="material-symbols-outlined text-base">add_circle</span>
                      <span>Thêm địa chỉ mới</span>
                    </button>
                    <span className="text-outline-variant">•</span>
                    <Link className={linkClass} to="/ho-so">
                      Quản lý địa chỉ
                    </Link>
                  </div>
                }
              >
                Địa chỉ giao hàng
              </CardTitle>

              <div className="space-y-space-sm">
                {isAddressLoading && <Loading>Đang tải địa chỉ…</Loading>}
                {!isAddressLoading && addresses.length === 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg border border-dashed border-line p-space-md bg-surface-container-low">
                    <div>
                      <p className="font-title-md text-title-md text-on-surface">Bạn chưa có địa chỉ giao hàng.</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">Vui lòng thêm địa chỉ để tiếp tục đặt hàng.</p>
                    </div>
                    <Button
                      size="sm"
                      icon="add"
                      onClick={() => {
                        setAddressFormError(null)
                        setAddressForm(EMPTY_ADDRESS_FORM)
                        setIsAddAddressModalOpen(true)
                      }}
                    >
                      Thêm địa chỉ mới
                    </Button>
                  </div>
                )}
                {addresses.map((address) => (
                  <RadioCard
                    key={address.id}
                    name="address"
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                  >
                    <span className="flex flex-wrap items-center gap-space-xs font-title-md text-title-md text-on-surface">
                      {address.recipientName} · {address.phone}
                      {address.isDefault && <Badge tone="primary">Mặc định</Badge>}
                    </span>
                    <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">
                      {address.fullAddress}
                    </span>
                  </RadioCard>
                ))}

                {/* Additional quick add button under list */}
                {addresses.length > 0 && (
                  <div className="pt-space-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAddressFormError(null)
                        setAddressForm(EMPTY_ADDRESS_FORM)
                        setIsAddAddressModalOpen(true)
                      }}
                      className="px-space-md py-2 text-primary hover:bg-primary-fixed/30 rounded-lg text-title-md font-title-md inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-dashed border-primary/40 w-full justify-center"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      <span>Giao đến địa chỉ khác (+ Thêm địa chỉ)</span>
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Voucher Card */}
            <Card as="section">
              <CardTitle
                icon="confirmation_number"
                actions={
                  <button
                    className={linkClass}
                    type="button"
                    disabled={voucherLoading || availableVouchers.length === 0}
                    onClick={() => {
                      setDraftVoucherCode(voucherCode)
                      setIsVoucherModalOpen(true)
                    }}
                  >
                    Chọn Voucher
                  </button>
                }
              >
                Voucher
              </CardTitle>
              <div className="flex items-start justify-between gap-space-md rounded-lg bg-surface-container-low p-space-md">
                <div className="space-y-0.5 font-body-md text-body-md text-on-surface-variant">
                  <strong className="block font-title-md text-title-md text-on-surface">
                    {voucherCode ? `Mã ${voucherCode}` : 'Chưa chọn voucher'}
                  </strong>
                  <span className="block">
                    {voucherLoading
                      ? 'Đang tải voucher…'
                      : voucherError ??
                        (availableVouchers.length === 0
                          ? 'Hiện chưa có voucher khả dụng.'
                          : 'Có thể chọn một voucher giảm giá cho đơn hàng.')}
                  </span>
                  {voucherCode && pricing && <span className="block">Đang kiểm tra mức giảm…</span>}
                  {voucherProblem && (
                    <span role="alert" className="block text-error">
                      {voucherProblem}
                    </span>
                  )}
                </div>
                {voucherDiscount > 0 && (
                  <strong className="font-price-md text-price-md text-secondary whitespace-nowrap">
                    -{formatVnd(voucherDiscount)}
                  </strong>
                )}
              </div>
            </Card>

            {/* Payment Method Card */}
            <Card as="section">
              <CardTitle icon="payments">Phương thức thanh toán</CardTitle>
              <div className="space-y-space-sm">
                {PAYMENT_METHODS.map(([value, title, description, icon]) => (
                  <RadioCard
                    key={value}
                    name="payment"
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                    aside={<span className="material-symbols-outlined text-on-surface-variant">{icon}</span>}
                  >
                    <span className="block font-title-md text-title-md text-on-surface">{title}</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">{description}</span>
                  </RadioCard>
                ))}
              </div>
            </Card>

            {/* Selected Products Card */}
            <Card as="section">
              <CardTitle icon="inventory_2">Sản phẩm đã chọn ({selectedLines.length})</CardTitle>
              <div className="divide-y divide-line">
                {selectedLines.map((line) => (
                  <div className="flex items-center gap-space-md py-space-sm" key={line.id}>
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-low">
                      <ProductThumb
                        seed={line.product.thumbSeed}
                        productType={line.product.productType}
                        imageUrl={line.product.imageUrl}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-title-md text-title-md text-on-surface line-clamp-2">{line.product.name}</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">Số lượng: {line.quantity}</p>
                    </div>
                    <LinePrice line={previewLine(line.id)} fallback={line.product.price * line.quantity} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sticky Aside Summary Card */}
          <Card as="aside" className="lg:col-span-4 lg:sticky lg:top-44 space-y-space-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface">Thanh toán</h2>
            {previewError && (
              <p role="alert" className="font-body-md text-body-md text-error">
                {previewError}
              </p>
            )}
            <SummaryRow label="Tạm tính" value={pricing ? '…' : formatVnd(subtotal)} />
            {invoiceDiscount > 0 && (
              <SummaryRow
                label={`Ưu đãi hoá đơn${preview?.invoiceProgramName ? ` (${preview.invoiceProgramName})` : ''}`}
                value={<span className="text-secondary whitespace-nowrap">-{formatVnd(invoiceDiscount)}</span>}
              />
            )}
            <SummaryRow
              label="Voucher"
              value={
                <span className={voucherDiscount > 0 ? 'text-secondary' : undefined}>
                  {voucherDiscount > 0 ? `-${formatVnd(voucherDiscount)}` : formatVnd(0)}
                </span>
              }
            />
            <SummaryRow label="Phí vận chuyển" value={formatVnd(Number(preview?.shippingFee ?? 0))} />
            <SummaryRow strong label="Tổng thanh toán" value={pricing ? '…' : formatVnd(totalAmount)} />
            <Button
              size="lg"
              className="w-full mt-space-sm"
              icon="check_circle"
              onClick={handleOpenConfirmModal}
              disabled={cannotSubmit}
            >
              Đặt hàng
            </Button>
            <p className="font-label-md text-label-md text-on-surface-variant text-center">
              Quý khách sẽ được xem lại thông tin đơn hàng trước khi tạo đơn chính thức.
            </p>
          </Card>
        </div>
      </Page>

      {/* 1. Modal: Chọn Voucher */}
      {isVoucherModalOpen && (
        <Modal
          eyebrow="Chợ Tốt Mua Voucher"
          title="Chọn Voucher"
          onClose={() => setIsVoucherModalOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDraftVoucherCode('')}>
                Bỏ chọn voucher
              </Button>
              <div className="flex gap-space-sm">
                <Button variant="outline" onClick={() => setIsVoucherModalOpen(false)}>
                  Trở lại
                </Button>
                <Button
                  onClick={() => {
                    setVoucherCode(draftVoucherCode)
                    setIsVoucherModalOpen(false)
                  }}
                >
                  Đồng ý
                </Button>
              </div>
            </>
          }
        >
          <p className="font-body-md text-body-md text-on-surface-variant">
            Chọn một voucher. Mức giảm được backend kiểm tra theo giá trị đơn hàng hiện tại.
          </p>
          {availableVouchers.map((voucher) => (
            <RadioCard
              key={voucher.id}
              name="voucher"
              checked={draftVoucherCode === voucher.code}
              onChange={() => setDraftVoucherCode(voucher.code)}
              aside={
                <span className="self-center rounded-lg bg-primary text-on-primary px-space-sm py-space-xs font-title-md text-title-md whitespace-nowrap">
                  {voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}
                </span>
              }
            >
              <span className="block font-title-md text-title-md text-on-surface">{voucher.programName}</span>
              <span className="block font-body-md text-body-md text-on-surface-variant mt-0.5">
                Mã: {voucher.code} · Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}
              </span>
              <span className="block font-label-md text-label-md text-on-surface-variant mt-0.5">{voucherScopeLabel(voucher)}</span>
            </RadioCard>
          ))}
        </Modal>
      )}

      {/* 2. Modal: Thêm Địa Chỉ Mới Trực Tiếp */}
      {isAddAddressModalOpen && (
        <Modal
          eyebrow="Giao hàng tận nơi"
          title="Thêm địa chỉ nhận hàng mới"
          onClose={() => setIsAddAddressModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsAddAddressModalOpen(false)} disabled={isSavingAddress}>
                Hủy
              </Button>
              <Button type="button" onClick={handleSaveNewAddress} disabled={isSavingAddress} icon="save">
                {isSavingAddress ? 'Đang lưu…' : 'Lưu & Sử dụng địa chỉ này'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveNewAddress} className="space-y-space-md">
            {addressFormError && <Alert>{addressFormError}</Alert>}

            <Field label="Họ và tên người nhận *" hint="Ví dụ: Nguyễn Văn A">
              <input
                className={inputClass}
                placeholder="Nhập họ và tên đầy đủ"
                value={addressForm.recipientName}
                onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))}
                required
                autoFocus
              />
            </Field>

            <Field label="Số điện thoại liên hệ *" hint="Shipper sẽ gọi tới số này khi giao hàng">
              <input
                type="tel"
                className={inputClass}
                placeholder="Ví dụ: 0912345678"
                value={addressForm.phone}
                onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </Field>

            <Field label="Địa chỉ nhận hàng chi tiết *" hint="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện, tỉnh/TP">
              <textarea
                className={`${inputClass} min-h-[84px] resize-none`}
                placeholder="Ví dụ: Số 123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP. Hồ Chí Minh"
                value={addressForm.fullAddress}
                onChange={(e) => setAddressForm((f) => ({ ...f, fullAddress: e.target.value }))}
                required
              />
            </Field>

            <label className="flex items-center gap-space-xs font-title-md text-title-md text-on-surface cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary rounded"
                checked={addressForm.isDefault}
                onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <span>Đặt làm địa chỉ nhận hàng mặc định</span>
            </label>
          </form>
        </Modal>
      )}

      {/* 3. Modal: Xác Nhận Lại Thông Tin Đơn Hàng Trước Khi Chốt Đặt */}
      {isConfirmOrderModalOpen && selectedAddress && (
        <Modal
          eyebrow="Kiểm tra lần cuối"
          title="Xác nhận đặt hàng"
          onClose={() => !isSubmitting && setIsConfirmOrderModalOpen(false)}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setIsConfirmOrderModalOpen(false)}
                disabled={isSubmitting}
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                onClick={handleFinalConfirmOrder}
                disabled={isSubmitting}
                icon="check_circle"
                className="px-space-xl"
              >
                {isSubmitting ? 'Đang tạo đơn…' : 'Xác nhận đặt hàng'}
              </Button>
            </>
          }
        >
          <div className="space-y-space-md text-on-surface">
            {error && <Alert>{error}</Alert>}

            {/* Recipient info summary */}
            <div className="bg-surface-container-low rounded-xl p-space-md space-y-1 border border-outline-variant/30">
              <div className="flex items-center gap-1.5 text-primary font-title-md text-title-md">
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                <span>Địa chỉ nhận hàng:</span>
              </div>
              <p className="font-title-md text-title-md text-on-surface">
                {selectedAddress.recipientName} · <strong>{selectedAddress.phone}</strong>
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {selectedAddress.fullAddress}
              </p>
            </div>

            {/* Payment method & Voucher summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 space-y-1">
                <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                  <span className="material-symbols-outlined text-base">payments</span>
                  <span>Phương thức:</span>
                </div>
                <p className="font-title-md text-title-md text-on-surface">
                  {selectedPaymentMethod?.[1] || 'Thanh toán khi nhận hàng'}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {selectedPaymentMethod?.[2]}
                </p>
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 space-y-1">
                <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                  <span className="material-symbols-outlined text-base">confirmation_number</span>
                  <span>Voucher giảm giá:</span>
                </div>
                <p className="font-title-md text-title-md text-on-surface">
                  {voucherCode ? `Mã: ${voucherCode}` : 'Không dùng voucher'}
                </p>
                {voucherDiscount > 0 && (
                  <p className="font-label-sm text-label-sm text-secondary font-bold">
                    Tiết kiệm {formatVnd(voucherDiscount)}
                  </p>
                )}
              </div>
            </div>

            {/* Items summary */}
            <div className="space-y-space-xs">
              <p className="font-title-md text-title-md text-on-surface">
                Danh sách sản phẩm ({selectedLines.length}):
              </p>
              <div className="max-h-48 overflow-y-auto divide-y divide-line rounded-lg border border-line bg-surface-container-lowest px-space-md">
                {selectedLines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-space-sm py-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-bold text-xs bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                        x{line.quantity}
                      </span>
                      <span className="font-body-md text-body-md truncate">{line.product.name}</span>
                    </div>
                    <span className="font-price-md text-price-md whitespace-nowrap ml-2">
                      {formatVnd(Number(previewLine(line.id)?.lineTotal ?? line.product.price * line.quantity))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment totals breakdown */}
            <div className="bg-surface-container-low rounded-xl p-space-md space-y-space-xs border border-outline-variant/30">
              <SummaryRow label="Tạm tính hàng hoá" value={formatVnd(subtotal)} />
              {invoiceDiscount > 0 && (
                <SummaryRow
                  label="Ưu đãi hoá đơn"
                  value={<span className="text-secondary whitespace-nowrap">-{formatVnd(invoiceDiscount)}</span>}
                />
              )}
              {voucherDiscount > 0 && (
                <SummaryRow
                  label="Giảm giá voucher"
                  value={<span className="text-secondary">-{formatVnd(voucherDiscount)}</span>}
                />
              )}
              <SummaryRow label="Phí giao hàng toàn quốc" value={<span className="text-secondary font-semibold">Miễn phí</span>} />
              <div className="pt-2 border-t border-line flex items-baseline justify-between">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">Tổng thanh toán:</span>
                <span className="font-price-lg text-price-lg text-primary font-bold">{formatVnd(totalAmount)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}


function BankTransferQRView({ order }: { order: CreatedOrder }) {
  const [status, setStatus] = useState<'waiting' | 'submitted'>('waiting')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  // Same deadline the backend enforces (OrderService.TRANSFER_DEADLINE): unpaid transfer orders are cancelled after 24 h.
  const [deadline] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000))
  const deadlineText = deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr))
    }, 2000)
  }

  const orderShortCode = `DH${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
  const transferNote = `CTM ${orderShortCode}`
  const bankName = 'MB Bank (Ngân hàng TMCP Quân Đội)'
  const bankAccount = '0388888888'
  const accountHolder = 'CHO TOT MUA GAMING'
  const qrUrl = `https://img.vietqr.io/image/MB-${bankAccount}-compact2.png?amount=${order.totalAmount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(accountHolder)}`

  // Nothing is verified here: sales confirms the money against the bank statement (PATCH /orders/{id}/payment-received).
  const handleConfirmPaid = () => setStatus('submitted')

  if (status === 'submitted') {
    return (
      <Page narrow>
        <Card className="text-center space-y-space-md">
          <span
            className="mx-auto w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </span>
          <div className="space-y-1">
            <Badge tone="info">Chờ shop xác nhận</Badge>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Đã ghi nhận chuyển khoản</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Shop sẽ đối chiếu sao kê và xác nhận khi nhận được tiền. Trạng thái thanh toán được cập nhật trong chi tiết đơn hàng.
            </p>
          </div>

          <div className="text-left rounded-xl bg-surface-container-low p-space-md space-y-space-xs border border-line">
            <SummaryRow label="Mã đơn hàng" value={<span className="font-mono text-label-md break-all">{order.id}</span>} />
            <SummaryRow label="Phương thức" value="Chuyển khoản ngân hàng (VietQR)" />
            <SummaryRow
              label="Trạng thái giao dịch"
              value={
                <span className="text-on-surface-variant font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  Chờ shop xác nhận
                </span>
              }
            />
            {order.discountAmount > 0 && (
              <SummaryRow
                label="Giảm giá"
                value={<span className="text-secondary">-{formatVnd(Number(order.discountAmount))}</span>}
              />
            )}
            <SummaryRow
              strong
              label="Số tiền cần chuyển"
              value={<span className="text-primary font-bold">{formatVnd(Number(order.totalAmount))}</span>}
            />
          </div>

          <p className="font-label-md text-label-md text-on-surface-variant">
            Nếu đơn bị huỷ sau khi shop đã nhận tiền, bạn sẽ được hoàn tiền về tài khoản ngân hàng của mình.
          </p>

          <div className="flex flex-wrap justify-center gap-space-sm pt-space-xs">
            <ButtonLink variant="outline" to="/">
              Về trang chủ
            </ButtonLink>
            <ButtonLink to={`/don-hang/${order.id}`} icon="receipt_long">
              Xem chi tiết đơn hàng
            </ButtonLink>
          </div>
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={[
          { label: 'Giỏ hàng', to: '/gio-hang' },
          { label: 'Thanh toán' },
          { label: 'Chuyển khoản QR' },
        ]}
        title="Thanh toán chuyển khoản qua mã QR"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        {/* QR Code Container */}
        <div className="lg:col-span-5">
          <Card className="text-center space-y-space-md p-space-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-label-md text-label-md">
              <span className="material-symbols-outlined text-base animate-pulse">schedule</span>
              <span>Chuyển khoản trước <strong>{deadlineText}</strong> — quá 24 giờ đơn sẽ tự huỷ</span>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-sm border-2 border-primary/20 max-w-[280px] mx-auto transition-all hover:border-primary/50">
              {!qrError ? (
                <img
                  src={qrUrl}
                  alt="Mã QR Chuyển khoản VietQR"
                  className="w-full h-auto aspect-square object-contain rounded-lg"
                  onError={() => setQrError(true)}
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center p-4 bg-surface-container-low rounded-lg text-center">
                  <span className="material-symbols-outlined text-5xl text-primary mb-2">qr_code_2</span>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Quét mã QR bằng App Ngân hàng
                  </p>
                  <p className="font-mono text-label-sm text-primary mt-1">{transferNote}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-title-md text-title-md text-on-surface flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-xl">qr_code_scanner</span>
                <span>Quét mã VietQR bằng App Ngân hàng</span>
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Hỗ trợ 40+ ứng dụng ngân hàng và ví điện tử (MB, VCB, Techcombank, MoMo,...)
              </p>
            </div>
          </Card>
        </div>

        {/* Transfer details and confirmation */}
        <div className="lg:col-span-7 space-y-space-md">
          <Card>
            <CardTitle icon="account_balance">Thông tin tài khoản thụ hưởng</CardTitle>
            <div className="space-y-space-sm mt-space-sm">
              {/* Ngân hàng */}
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-line">
                <div>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Ngân hàng</span>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">{bankName}</span>
                </div>
                <Badge tone="info">MB Bank</Badge>
              </div>

              {/* Số tài khoản */}
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-line">
                <div>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Số tài khoản</span>
                  <span className="font-mono font-bold text-headline-sm text-primary">{bankAccount}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-line hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 cursor-pointer transition-colors"
                  onClick={() => copyText(bankAccount, 'account')}
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedKey === 'account' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedKey === 'account' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Chủ tài khoản */}
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-line">
                <div>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Chủ tài khoản</span>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">{accountHolder}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-line hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 cursor-pointer transition-colors"
                  onClick={() => copyText(accountHolder, 'holder')}
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedKey === 'holder' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedKey === 'holder' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Số tiền */}
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-primary/5 border border-primary/20">
                <div>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Số tiền thanh toán</span>
                  <span className="font-price-lg text-price-lg text-primary font-bold">{formatVnd(Number(order.totalAmount))}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-label-md flex items-center gap-1 cursor-pointer transition-colors"
                  onClick={() => copyText(String(order.totalAmount), 'amount')}
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedKey === 'amount' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedKey === 'amount' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Nội dung chuyển khoản */}
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-secondary/5 border border-secondary/20">
                <div>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">Nội dung chuyển khoản (bắt buộc)</span>
                  <span className="font-mono font-bold text-headline-sm text-secondary">{transferNote}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 text-secondary font-label-md text-label-md flex items-center gap-1 cursor-pointer transition-colors"
                  onClick={() => copyText(transferNote, 'memo')}
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedKey === 'memo' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedKey === 'memo' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low border border-line text-on-surface-variant text-label-md space-y-1">
              <p className="font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-base">info</span>
                Hướng dẫn hoàn tất:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-label-sm">
                <li>Quét mã QR trên màn hình bằng App Ngân hàng bất kỳ hoặc sao chép thông tin để chuyển khoản.</li>
                <li>Mã QR đã mã hóa sẵn số tiền và nội dung chuyển khoản tự động.</li>
                <li>Sau khi chuyển khoản thành công trên app ngân hàng, bấm nút <strong>"Tôi đã chuyển khoản"</strong> bên dưới. Shop sẽ xác nhận khi nhận được tiền.</li>
              </ol>
            </div>

            <div className="mt-space-lg flex flex-col sm:flex-row items-center gap-space-sm">
              <Button
                variant="primary"
                className="w-full sm:flex-1 py-3 text-body-lg font-bold flex items-center justify-center gap-2"
                onClick={handleConfirmPaid}
              >
                <span className="material-symbols-outlined">check_circle</span>
                <span>Tôi đã chuyển khoản</span>
              </Button>
              <ButtonLink
                variant="outline"
                to={`/don-hang/${order.id}`}
                className="w-full sm:w-auto"
              >
                Thanh toán sau
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}

/** A line's charged total, with the list price struck through when a Flash Sale or % promotion applies. */
function LinePrice({ line, fallback }: { line?: PreviewLine; fallback: number }) {
  if (!line) {
    return <strong className="font-price-md text-price-md text-on-surface whitespace-nowrap">{formatVnd(fallback)}</strong>
  }
  const promoted = line.promotionKind != null && Number(line.unitPrice) < Number(line.listPrice)
  return (
    <div className="text-right whitespace-nowrap">
      <strong className={`block font-price-md text-price-md ${promoted ? 'text-primary' : 'text-on-surface'}`}>
        {formatVnd(Number(line.lineTotal))}
      </strong>
      {promoted && (
        <>
          <span className="block font-label-sm text-label-sm text-on-surface-variant line-through">
            {formatVnd(Number(line.listPrice) * line.quantity)}
          </span>
          <span className="block font-label-sm text-label-sm text-secondary">
            {line.promotionKind === 'flash' ? 'Flash Sale' : (line.promotionProgramName ?? 'Khuyến mãi')}
          </span>
        </>
      )}
    </div>
  )
}
