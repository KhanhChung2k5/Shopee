import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, ButtonLink, Card, CardTitle, EmptyState, Loading, Page, PageHeader, SummaryRow, cx, inputClass } from '../components/ui'
import ProductThumb from '../components/ProductThumb'
import { formatVnd } from '../lib/catalog'
import { apiFetch, ApiError } from '../lib/api'
import { SHIPMENT_LABEL, STATUS_LABEL, STATUS_TONE, formatOrderDate as formatDate, type OrderStatus } from '../lib/orderStatus'
import { useAuth } from '../state/AuthContext'
import type { Refund } from '../lib/refunds'
import { CancellationRefundCard, ItemRefund } from './OrderRefunds'
import { fetchOrderInvoices, invoiceDate, type OrderInvoices } from '../lib/invoices'

interface OrderItem {
  id: string
  variantId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productNameSnapshot: string
  variantAttributesSnapshot: string | null
  imageUrl?: string | null
}

interface StatusHistoryEntry {
  id: string
  status: OrderStatus
  changedBy: string
  changedByType: string
  reason: string | null
  changedAt: string
}

interface OrderDetail {
  id: string
  addressId: string
  shippingAddressSnapshot: string
  subtotalAmount: number
  discountAmount: number
  shippingFeeAmount: number
  totalAmount: number
  status: OrderStatus
  warehouseId: string | null
  shippingProviderName: string | null
  trackingNo: string | null
  shipmentStatus: string
  createdAt: string
  items: OrderItem[]
  statusHistory: StatusHistoryEntry[]
  payment: { method: string; status: string; amount: number; paidAt: string | null } | null
  refunds: Refund[]
}

const PAYMENT_METHOD: Record<string, string> = { cod: 'Thanh toán khi nhận hàng (COD)', bank_transfer: 'Chuyển khoản ngân hàng' }
const PAYMENT_STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'info' | 'danger' }> = {
  pending: { label: 'Chưa thanh toán', tone: 'neutral' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  cancelled: { label: 'Đã huỷ', tone: 'danger' },
  partially_refunded: { label: 'Đã hoàn một phần', tone: 'info' },
  refunded: { label: 'Đã hoàn tiền', tone: 'info' },
}

interface StatusUpdateResponse {
  orderId: string
  previousStatus: OrderStatus
  status: OrderStatus
  change: StatusHistoryEntry
}

interface ReviewResponse {
  id: string
  orderItemId: string
  rating: number
  comment: string | null
  replyText: string | null
}

/** GET /reviews/mine?orderId= — per line: its review, and whether it can be reviewed or changed now. */
interface ReviewLine {
  orderItemId: string
  review: ReviewResponse | null
  canReview: boolean
  canEdit: boolean
  blockedReason: string | null
}

interface OrderReviews {
  deadline: string | null
  lines: ReviewLine[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TIMELINE_DOT: Record<OrderStatus, string> = {
  pending: 'bg-primary',
  confirmed: 'bg-tertiary',
  cancel_requested: 'bg-error',
  shipping: 'bg-tertiary',
  delivered: 'bg-secondary',
  cancelled: 'bg-outline',
}

function seedFromId(value: string) {
  return [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6
}

function formatAttributes(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const parts = Object.entries(parsed).map(([key, value]) => `${key}: ${String(value)}`)
    return parts.length > 0 ? parts.join(' · ') : null
  } catch {
    return raw
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user, isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return <Page><Loading>Đang kiểm tra đăng nhập…</Loading></Page>
  }
  if (!isAuthenticated || !token) {
    return <Navigate to="/dang-nhap" replace state={{ from: id ? `/don-hang/${id}` : '/don-hang' }} />
  }
  if (user?.role === 'staff') {
    return <Navigate to="/admin/don-hang" replace />
  }
  if (!id || !UUID_PATTERN.test(id)) {
    return (
      <Page narrow>
        <Card>
          <EmptyState icon="link_off" title="Đường dẫn đơn hàng không hợp lệ" action={<ButtonLink variant="outline" to="/don-hang">Về lịch sử đơn hàng</ButtonLink>} />
        </Card>
      </Page>
    )
  }

  return <OrderDetailContent key={id} orderId={id} token={token} />
}

function OrderDetailContent({ orderId, token }: { orderId: string; token: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  // The backend already returns each line's picture (variant image, else the product's first image),
  // so no second request for the whole catalogue just to look pictures up.
  const resolveItemImage = (item: OrderItem) => item.imageUrl ?? undefined

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    apiFetch<OrderDetail>(`/orders/${orderId}`, { signal: controller.signal }, token)
      .then((data) => {
        if (active) setOrder(data)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(requestError instanceof ApiError ? requestError.message : 'Không tải được chi tiết đơn hàng')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [orderId, retryKey, token])

  const [reviews, setReviews] = useState<OrderReviews | null>(null)
  const [invoices, setInvoices] = useState<OrderInvoices | null>(null)
  const delivered = order?.status === 'delivered'

  const loadReviews = () => {
    apiFetch<OrderReviews>(`/reviews/mine?orderId=${orderId}`, {}, token).then(setReviews).catch(() => setReviews(null))
  }
  useEffect(() => {
    if (!delivered) return
    loadReviews()
    fetchOrderInvoices(token, orderId).then(setInvoices).catch(() => setInvoices(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivered, orderId, token])

  /** Refetch quietly after a refund request or bank-account change. */
  const reload = () => {
    apiFetch<OrderDetail>(`/orders/${orderId}`, {}, token).then(setOrder).catch(() => undefined)
    if (delivered) loadReviews() // a return request closes the line to reviews
  }

  const retry = () => {
    setError(null)
    setIsLoading(true)
    setRetryKey((key) => key + 1)
  }

  const cancelOrder = async () => {
    const reason = cancelReason.trim()
    if (!reason) {
      setCancelError('Vui lòng nhập lý do huỷ đơn')
      return
    }

    setIsCancelling(true)
    setCancelError(null)
    try {
      const result = await apiFetch<StatusUpdateResponse>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancel_requested', reason }),
      }, token)
      setOrder((current) => current ? {
        ...current,
        status: result.status,
        statusHistory: [...current.statusHistory, result.change],
      } : current)
      setShowCancelForm(false)
      setCancelReason('')
    } catch (requestError) {
      setCancelError(requestError instanceof ApiError ? requestError.message : 'Không thể huỷ đơn hàng')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return <Page><Loading>Đang tải chi tiết đơn hàng…</Loading></Page>
  }

  if (error || !order) {
    return (
      <Page narrow>
        <Card>
          <EmptyState
            icon="error"
            title="Không thể mở đơn hàng"
            description={error ?? 'Không tìm thấy đơn hàng'}
            action={<div className="flex gap-space-sm">
              <ButtonLink variant="outline" to="/don-hang">Về lịch sử đơn hàng</ButtonLink>
              <Button icon="refresh" onClick={retry}>Thử lại</Button>
            </div>}
          />
        </Card>
      </Page>
    )
  }

  const canCancel = order.status === 'pending' || order.status === 'confirmed'
  const deliveredAt = [...order.statusHistory].reverse().find((entry) => entry.status === 'delivered')?.changedAt ?? null
  const refunds = order.refunds ?? []
  const cancellationRefund = refunds.find((refund) => refund.kind === 'cancellation')
  const paidByTransfer = order.payment?.method === 'bank_transfer' && order.payment.status === 'paid'
  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Đơn mua', to: '/don-hang' }, { label: 'Chi tiết đơn hàng' }]}
        title={`Đơn #${order.id.slice(0, 8).toUpperCase()}`}
        subtitle={`Đặt lúc ${formatDate(order.createdAt)}`}
        actions={<Badge tone={STATUS_TONE[order.status] ?? 'neutral'} className="!text-label-md px-space-sm py-1">{STATUS_LABEL[order.status]}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <div className="lg:col-span-8 space-y-space-md">
          <Card as="section">
            <CardTitle icon="inventory_2">Sản phẩm ({order.items.length})</CardTitle>
            <div className="divide-y divide-line">
              {order.items.map((item) => {
                const attributes = formatAttributes(item.variantAttributesSnapshot)
                const itemImg = resolveItemImage(item)
                return (
                  <div className="py-space-sm space-y-space-sm" key={item.id}>
                    <div className="flex items-center gap-space-md">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center font-title-lg text-title-lg text-on-surface-variant">
                        <ProductThumb
                          seed={seedFromId(item.variantId || item.id)}
                          productType="accessory"
                          imageUrl={itemImg}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <strong className="block font-title-md text-title-md text-on-surface">{item.productNameSnapshot}</strong>
                        {attributes && <span className="block font-body-md text-body-md text-on-surface-variant">{attributes}</span>}
                        <span className="block font-body-md text-body-md text-on-surface-variant">{formatVnd(Number(item.unitPrice))} × {item.quantity}</span>
                      </div>
                      <strong className="font-price-md text-price-md text-on-surface whitespace-nowrap">{formatVnd(Number(item.lineTotal))}</strong>
                    </div>
                    {order.status === 'delivered' && reviews && (
                      <OrderItemReview
                        line={reviews.lines.find((line) => line.orderItemId === item.id) ?? null}
                        deadline={reviews.deadline}
                        orderItemId={item.id}
                        productName={item.productNameSnapshot}
                        token={token}
                        onChanged={loadReviews}
                      />
                    )}
                    {order.status === 'delivered' && (
                      <ItemRefund orderItemId={item.id} productName={item.productNameSnapshot} refunds={refunds}
                        deliveredAt={deliveredAt} token={token} onChanged={reload} />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card as="section">
            <CardTitle icon="timeline">Hành trình đơn hàng</CardTitle>
            <ol className="relative ml-1.5 border-l-2 border-line space-y-space-md">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className="relative pl-space-lg">
                  <span className={cx('absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest', TIMELINE_DOT[entry.status] ?? 'bg-outline')} aria-hidden="true" />
                  <strong className="block font-title-md text-title-md text-on-surface">{STATUS_LABEL[entry.status] ?? entry.status}</strong>
                  <span className="block font-label-md text-label-md text-on-surface-variant">{formatDate(entry.changedAt)} · {entry.changedByType === 'buyer' ? 'Khách hàng' : entry.changedByType === 'system' ? 'Hệ thống' : 'Nhân viên'}</span>
                  {entry.reason && <p className="mt-1 font-body-md text-body-md text-on-surface bg-surface-container-low rounded-lg px-space-sm py-space-xs">{entry.reason}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="lg:col-span-4 space-y-space-md">
          <Card as="section">
            <CardTitle icon="local_shipping">Giao hàng</CardTitle>
            <dl className="space-y-space-sm font-body-md text-body-md">
              <InfoRow label="Địa chỉ">{order.shippingAddressSnapshot}</InfoRow>
              <InfoRow label="Trạng thái">{SHIPMENT_LABEL[order.shipmentStatus] ?? order.shipmentStatus}</InfoRow>
              {order.shippingProviderName && <InfoRow label="Đơn vị vận chuyển">{order.shippingProviderName}</InfoRow>}
              {order.trackingNo && <InfoRow label="Mã vận đơn"><code className="font-mono bg-surface-container-low rounded px-1">{order.trackingNo}</code></InfoRow>}
            </dl>
          </Card>

          <Card as="section" className="space-y-space-sm">
            <CardTitle icon="payments">Thanh toán</CardTitle>
            <SummaryRow label="Tạm tính" value={formatVnd(Number(order.subtotalAmount))} />
            <SummaryRow label="Giảm giá" value={`− ${formatVnd(Number(order.discountAmount))}`} />
            <SummaryRow label="Phí vận chuyển" value={formatVnd(Number(order.shippingFeeAmount))} />
            <SummaryRow strong label="Tổng cộng" value={formatVnd(Number(order.totalAmount))} />
            {order.payment && (
              <div className="flex flex-wrap items-center justify-between gap-space-xs border-t border-line pt-space-sm font-body-md text-body-md">
                <span className="text-on-surface-variant">{PAYMENT_METHOD[order.payment.method] ?? order.payment.method}</span>
                <Badge tone={PAYMENT_STATUS[order.payment.status]?.tone ?? 'neutral'}>{PAYMENT_STATUS[order.payment.status]?.label ?? order.payment.status}</Badge>
              </div>
            )}
            {order.payment?.method === 'bank_transfer' && order.payment.status === 'pending' && order.status !== 'cancelled' && (
              <p className="font-label-md text-label-md text-on-surface-variant">
                Shop sẽ xác nhận sau khi đối chiếu tiền chuyển khoản của bạn. Hạn chuyển khoản:{' '}
                {new Date(new Date(order.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                {' '}— quá hạn đơn sẽ tự huỷ.
              </p>
            )}
          </Card>

          {invoices?.current && (
            <Card as="section" className="space-y-space-sm">
              <CardTitle icon="receipt_long">Hoá đơn</CardTitle>
              <div className="font-body-md text-body-md space-y-0.5">
                <div className="flex justify-between gap-space-sm"><span className="text-on-surface-variant">Số hoá đơn</span><strong>{invoices.current.invoiceNo}</strong></div>
                <div className="flex justify-between gap-space-sm"><span className="text-on-surface-variant">Ngày lập</span><span>{invoiceDate(invoices.current.issuedAt)}</span></div>
                <div className="flex justify-between gap-space-sm"><span className="text-on-surface-variant">Thuế GTGT ({invoices.current.vatRate}%)</span><span>{formatVnd(Number(invoices.current.vatAmount))}</span></div>
              </div>
              <Link to={`/hoa-don/${order.id}`} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary py-2 font-title-md text-title-md text-primary hover:bg-primary-fixed/40">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">print</span>Xem và in hoá đơn
              </Link>
              <p className="font-label-md text-label-md text-on-surface-variant">Cần hoá đơn công ty (có mã số thuế)? Gửi yêu cầu hỗ trợ, shop sẽ lập lại hoá đơn cho bạn.</p>
            </Card>
          )}

          {cancellationRefund && <CancellationRefundCard refund={cancellationRefund} token={token} onChanged={reload} />}

          <ButtonLink variant="outline" className="w-full" icon="support_agent" to={`/ho-tro?order=${order.id}`}>
            Cần hỗ trợ về đơn này
          </ButtonLink>

          {canCancel && (
            <Card as="section">
              {!showCancelForm ? (
                <Button variant="outline" className="w-full" icon="cancel" onClick={() => setShowCancelForm(true)}>
                  Gửi yêu cầu huỷ đơn
                </Button>
              ) : (
                <div className="space-y-space-sm">
                  <label className="block font-title-md text-title-md text-on-surface" htmlFor="cancel-reason">Lý do huỷ đơn</label>
                  <textarea
                    id="cancel-reason"
                    className={inputClass}
                    maxLength={500}
                    rows={4}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Cho chúng tôi biết lý do bạn muốn huỷ…"
                    disabled={isCancelling}
                  />
                  <span className="block text-right font-label-sm text-label-sm text-on-surface-variant">{cancelReason.length}/500</span>
                  {cancelError && <Alert>{cancelError}</Alert>}
                  <div className="flex justify-end gap-space-sm">
                    <Button variant="outline" size="sm" disabled={isCancelling} onClick={() => { setShowCancelForm(false); setCancelError(null) }}>Giữ đơn</Button>
                    <Button variant="danger" size="sm" disabled={isCancelling || !cancelReason.trim()} onClick={() => void cancelOrder()}>
                      {isCancelling ? 'Đang gửi…' : 'Gửi yêu cầu huỷ'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {order.status === 'cancel_requested' && (
            <Alert tone="info">
              <strong className="block font-title-md text-title-md">Yêu cầu huỷ đang chờ xác nhận</strong>
              Đơn hàng chưa bị huỷ. Người bán hoặc nhân viên phụ trách sẽ xem xét và xác nhận yêu cầu.
              {paidByTransfer && ' Nếu đơn được huỷ, shop sẽ hoàn lại tiền bạn đã chuyển khoản.'}
            </Alert>
          )}
        </aside>
      </div>
    </Page>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-label-md text-label-md text-on-surface-variant">{label}</dt>
      <dd className="text-on-surface">{children}</dd>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex text-primary" aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className="material-symbols-outlined text-base" style={star <= value ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
      ))}
    </span>
  )
}

/**
 * A buyer's review of one delivered line: write it, then (within 30 days of delivery) change or remove it.
 * What is allowed comes from GET /reviews/mine, so a reload shows the review instead of the button again.
 */
function OrderItemReview({ line, deadline, orderItemId, productName, token, onChanged }: {
  line: ReviewLine | null
  deadline: string | null
  orderItemId: string
  productName: string
  token: string
  onChanged: () => void
}) {
  const review = line?.review ?? null
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const until = deadline ? new Date(deadline).toLocaleDateString('vi-VN') : null

  const startEditing = () => {
    setRating(review?.rating ?? 0)
    setComment(review?.comment ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    if (rating < 1) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch<ReviewResponse>(review ? `/reviews/${review.id}` : '/reviews', {
        method: review ? 'PUT' : 'POST',
        body: JSON.stringify({ orderItemId, rating, comment: comment.trim() || null }),
      }, token)
      setEditing(false)
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không lưu được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!review || !window.confirm(`Xoá đánh giá của bạn về ${productName}?`)) return
    setSubmitting(true)
    try {
      await apiFetch<void>(`/reviews/${review.id}`, { method: 'DELETE' }, token)
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không xoá được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  if (editing) {
    return (
      <div className="ml-20 rounded-lg border border-line p-space-md space-y-space-sm">
        <div className="flex gap-0.5" role="radiogroup" aria-label="Chọn số sao">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="text-primary cursor-pointer disabled:cursor-not-allowed hover:scale-110 transition-transform"
              aria-pressed={star <= rating}
              aria-label={`${star} sao`}
              onClick={() => setRating(star)}
              disabled={submitting}
            >
              <span className="material-symbols-outlined text-3xl" style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
            </button>
          ))}
        </div>
        <textarea
          className={inputClass}
          maxLength={2000}
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Sản phẩm dùng thế nào? Chia sẻ để người mua sau tham khảo…"
          disabled={submitting}
        />
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-space-sm">
          <Button variant="outline" size="sm" disabled={submitting} onClick={() => { setEditing(false); setError(null) }}>Huỷ</Button>
          <Button size="sm" disabled={submitting} onClick={() => void save()}>
            {submitting ? 'Đang lưu…' : review ? 'Lưu thay đổi' : 'Gửi đánh giá'}
          </Button>
        </div>
      </div>
    )
  }

  if (review) {
    return (
      <div className="ml-20 rounded-lg bg-secondary-container/40 px-space-md py-space-sm space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <Stars value={review.rating} />
          {line?.canEdit && (
            <span className="flex gap-space-xs">
              <Button variant="outline" size="sm" icon="edit" disabled={submitting} onClick={startEditing}>Sửa</Button>
              <Button variant="outline" size="sm" icon="delete" disabled={submitting} onClick={() => void remove()}>Xoá</Button>
            </span>
          )}
        </div>
        {review.comment && <p className="font-body-md text-body-md text-on-surface">{review.comment}</p>}
        {review.replyText && (
          <p className="rounded border-l-4 border-primary bg-surface-container-lowest px-space-sm py-1 font-body-md text-body-md">
            <span className="block font-label-md text-label-md text-primary">Phản hồi của Chợ Tốt Mua</span>{review.replyText}
          </p>
        )}
        <span className="block font-label-md text-label-md text-on-secondary-container">
          {line?.canEdit && until ? `Bạn có thể sửa hoặc xoá đánh giá đến hết ngày ${until}.` : 'Cảm ơn bạn đã đánh giá!'}
        </span>
        {error && <Alert>{error}</Alert>}
      </div>
    )
  }

  if (line?.canReview) {
    return (
      <div className="ml-20 flex flex-wrap items-center gap-space-sm">
        <Button variant="outline" size="sm" icon="rate_review" onClick={startEditing}>Viết đánh giá</Button>
        {until && <span className="font-label-md text-label-md text-on-surface-variant">Hạn đánh giá: {until}</span>}
      </div>
    )
  }

  return line?.blockedReason
    ? <p className="ml-20 font-label-md text-label-md text-on-surface-variant">{line.blockedReason}</p>
    : null
}
