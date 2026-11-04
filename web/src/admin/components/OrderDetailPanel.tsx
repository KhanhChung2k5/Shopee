import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../../lib/api'
import { describeAttributes, formatVnd, resolveCatalogImageUrl } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { a, statusPillClass } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { useDialog } from '../../state/DialogContext'
import { REFUND_KIND_LABEL, REFUND_STATUS_LABEL, REFUND_STATUS_TONE } from '../../lib/refunds'
import { canAccessSection, type Department } from '../access'
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SHIPMENT_STATUS_LABEL, orderCode,
  type OrderStatus, type StaffOrderDetail,
} from '../orders'

interface Warehouse { id: string; name: string }

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

/**
 * One order for staff, shown beside the order list: what to do next (for this department) first, then payment,
 * products, customer, shipping and the timeline. `onChanged` lets the list refresh the row after an action.
 */
export default function OrderDetailPanel({ orderId, onClose, onChanged, position }: {
  orderId: string
  onClose: () => void
  onChanged: () => void
  /** "3 / 98" — where this order sits in the current list, for the ↑/↓ hint. */
  position?: string
}) {
  const { token, user } = useAuth()
  const { confirm, prompt } = useDialog()
  const department = user?.department
  const canDecide = department === 'sales' || department === 'admin'
  const canShip = department === 'warehouse' || department === 'admin'
  const [order, setOrder] = useState<StaffOrderDetail | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [warehouseId, setWarehouseId] = useState('')
  const [provider, setProvider] = useState('Giao Hàng Nhanh')
  const [trackingNo, setTrackingNo] = useState('')

  const load = useCallback(() => {
    if (!token || !orderId) return
    apiFetch<StaffOrderDetail>(`/orders/${orderId}`, {}, token)
      .then((data) => {
        if (data.id !== orderId) return
        setOrder(data)
        setError('')
        setTrackingNo(data.trackingNo ?? '')
        setWarehouseId(data.warehouseId ?? '')
        setProvider(data.shippingProviderName ?? 'Giao Hàng Nhanh')
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đơn hàng'))
  }, [token, orderId])

  // Switching to another order: show its own data only, never the previous order's while loading.
  useEffect(() => { setOrder(null); setError(''); load() }, [load])
  useEffect(() => {
    if (!token) return
    apiFetch<Warehouse[]>('/api/catalog/warehouses', {}, token).then(setWarehouses).catch(() => setWarehouses([]))
  }, [token])

  const run = async (path: string, body: unknown) => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token)
      load()
      onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không cập nhật được đơn hàng')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: OrderStatus, ask: 'cancel' | 'keep' | null) => {
    let reason: string | null = null
    if (ask === 'cancel') {
      reason = await prompt({
        title: 'Huỷ đơn hàng',
        message: <>Huỷ đơn <strong>{orderCode(orderId)}</strong>? Lý do được lưu vào hành trình đơn và khách sẽ thấy.{order?.payment?.status === 'paid' ? ' Khách đã thanh toán — hệ thống sẽ tạo yêu cầu hoàn tiền cho CSKH.' : ''}</>,
        label: 'Lý do huỷ', type: 'textarea', placeholder: 'VD: Khách yêu cầu huỷ, hết hàng…',
        confirmLabel: 'Huỷ đơn', cancelLabel: 'Quay lại', tone: 'danger',
      })
      if (reason == null) return
    } else if (ask === 'keep') {
      reason = await prompt({
        title: 'Từ chối yêu cầu huỷ',
        message: <>Giữ đơn <strong>{orderCode(orderId)}</strong> ở trạng thái đã xác nhận. Khách sẽ thấy lý do trong hành trình đơn.</>,
        label: 'Lý do từ chối', type: 'textarea', placeholder: 'VD: Đơn đã đóng gói, sắp bàn giao vận chuyển…',
        confirmLabel: 'Từ chối huỷ', cancelLabel: 'Quay lại',
      })
      if (reason == null) return
    }
    void run(`/orders/${orderId}/status`, { status, reason })
  }

  /** The parcel came back undelivered: the order is cancelled and its goods go back into stock. */
  const deliveryFailed = async () => {
    const reason = await prompt({
      title: 'Giao hàng thất bại',
      message: <>Đơn <strong>{orderCode(orderId)}</strong> sẽ bị huỷ, hàng được nhập lại kho đã xuất.{order?.payment?.status === 'paid' ? ' Khách đã thanh toán — hệ thống sẽ tạo yêu cầu hoàn tiền cho CSKH.' : ' Thanh toán COD chưa thu sẽ được huỷ.'}</>,
      label: 'Lý do', type: 'textarea', placeholder: 'VD: Khách từ chối nhận hàng, không liên lạc được…',
      confirmLabel: 'Xác nhận thất bại', cancelLabel: 'Quay lại', tone: 'danger',
    })
    if (reason == null) return
    void run(`/orders/${orderId}/delivery-failed`, { reason })
  }

  const confirmTransfer = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã nhận tiền',
      message: <>Đã đối chiếu sao kê và nhận đủ <strong>{formatVnd(order?.payment?.amount ?? 0)}</strong> cho đơn <strong>{orderCode(orderId)}</strong>? {order?.status === 'cancelled' ? 'Đơn đã huỷ nên hệ thống sẽ tạo yêu cầu hoàn lại toàn bộ số tiền cho CSKH.' : 'Nếu đơn bị huỷ sau đó, khách sẽ được hoàn tiền.'}</>,
      confirmLabel: 'Đã nhận tiền',
    })
    if (ok) void run(`/orders/${orderId}/payment-received`, {})
  }

  const header = (
    <div className="sticky top-0 z-[1] flex items-start justify-between gap-space-sm bg-surface-container-lowest px-space-lg pt-space-md pb-space-sm border-b border-line">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-space-xs">
          <h2 className="font-headline-md text-headline-md !mb-0">Đơn {orderCode(orderId)}</h2>
          {order && <span className={statusPillClass(ORDER_STATUS_TONE[order.status])}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>}
          {order && <span className={statusPillClass('info')}>{SHIPMENT_STATUS_LABEL[order.shipmentStatus] ?? order.shipmentStatus}</span>}
        </div>
        <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
          {order ? `Đặt lúc ${dateTime.format(new Date(order.createdAt))}` : 'Đang tải…'}
          {position && <span className="ml-space-xs">· {position}<span className="hidden md:inline"> · dùng ↑ ↓ để chuyển đơn, Esc để đóng</span></span>}
        </p>
      </div>
      <button type="button" aria-label="Đóng chi tiết đơn" title="Đóng (Esc)" onClick={onClose}
        className="flex-shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  )

  if (!order) {
    return (
      <div>
        {header}
        <div className="p-space-lg">
          {error ? <p role="alert" className="text-error">{error}</p> : <div className="space-y-space-sm animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-surface-container-low" />)}</div>}
        </div>
      </div>
    )
  }

  const customer = order.customer
  const transferUnpaid = order.payment?.method === 'bank_transfer' && order.payment.status === 'pending'
  const lateTransfer = order.payment?.method === 'bank_transfer' && order.payment.status === 'cancelled' && order.status === 'cancelled'
  const canPack = canShip && order.status === 'confirmed' && !transferUnpaid
    && (order.shipmentStatus === 'pending' || order.shipmentStatus === 'packed')
  const decisions = canDecide && ['pending', 'confirmed', 'cancel_requested'].includes(order.status)
  const handover = canShip && order.shipmentStatus === 'packed' && order.status === 'confirmed'
  const deliver = canShip && order.status === 'shipping'
  const hasActions = decisions || canPack || handover || deliver || (canDecide && (transferUnpaid || lateTransfer))

  return (
    <div>
      {header}
      <div className="p-space-lg space-y-space-md">
        {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}

        {hasActions && (
          <Section title="Việc cần làm" accent>
            {decisions && (
              <div className={a.rowActions}>
                {order.status === 'pending' && (
                  <button type="button" className={buttonClass('primary', 'sm')} disabled={busy} onClick={() => void setStatus('confirmed', null)}>Xác nhận đơn</button>
                )}
                {order.status === 'cancel_requested' && (
                  <button type="button" className={buttonClass('primary', 'sm')} disabled={busy} onClick={() => void setStatus('confirmed', 'keep')}>Từ chối yêu cầu huỷ</button>
                )}
                <button type="button" className={buttonClass('outline', 'sm')} disabled={busy} onClick={() => void setStatus('cancelled', 'cancel')}>
                  {order.status === 'cancel_requested' ? 'Đồng ý huỷ' : 'Huỷ đơn'}
                </button>
              </div>
            )}
            {canDecide && (transferUnpaid || lateTransfer) && (
              <button type="button" className={`${buttonClass(lateTransfer ? 'outline' : 'primary', 'sm')} mt-space-xs`} disabled={busy} onClick={() => void confirmTransfer()}>
                {lateTransfer ? 'Khách chuyển tiền sau khi huỷ' : 'Xác nhận đã nhận tiền'}
              </button>
            )}
            {canShip && order.status === 'confirmed' && transferUnpaid && (
              <p className="font-body-md text-body-md text-on-surface-variant">Đơn chuyển khoản chưa được xác nhận nhận tiền — chưa thể đóng gói. Đơn tự huỷ nếu sau 24 giờ vẫn chưa có tiền.</p>
            )}
            {canPack && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs mt-space-xs">
                <label className="block font-label-md text-label-md">Kho xuất hàng
                  <select className={a.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    <option value="">Chọn kho</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </label>
                <label className="block font-label-md text-label-md">Đơn vị vận chuyển
                  <input className={a.input} value={provider} onChange={(e) => setProvider(e.target.value)} />
                </label>
                <button type="button" className={`${buttonClass('primary', 'sm')} sm:col-span-2 justify-self-start`} disabled={busy || !warehouseId || !provider.trim()}
                  onClick={() => void run(`/orders/${orderId}/shipping-info`, { warehouseId, shippingProviderName: provider.trim() })}>
                  {order.shipmentStatus === 'packed' ? 'Cập nhật đóng gói' : 'Đóng gói & xuất kho'}
                </button>
              </div>
            )}
            {handover && (
              <div className="flex flex-wrap items-end gap-space-xs mt-space-xs">
                <label className="block flex-1 min-w-[160px] font-label-md text-label-md">Mã vận đơn
                  <input className={a.input} value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="VD: GHN123456" />
                </label>
                <button type="button" className={buttonClass('primary', 'sm')} disabled={busy || !trackingNo.trim()}
                  onClick={() => void run(`/orders/${orderId}/tracking`, { trackingNo: trackingNo.trim(), shipmentStatus: 'shipping' })}>
                  Bàn giao vận chuyển
                </button>
              </div>
            )}
            {deliver && (
              <button type="button" className={`${buttonClass('primary', 'sm')} mt-space-xs`} disabled={busy}
                onClick={() => void run(`/orders/${orderId}/tracking`, { trackingNo: order.trackingNo ?? trackingNo, shipmentStatus: 'delivered' })}>
                Xác nhận đã giao
              </button>
            )}
            {deliver && (
              <button type="button" className={`${buttonClass('outline', 'sm')} mt-space-xs ml-space-xs`} disabled={busy}
                onClick={() => void deliveryFailed()}>
                Giao thất bại
              </button>
            )}
            {order.shipmentStatus === 'packed' && decisions && <p className="font-label-md text-label-md text-on-surface-variant mt-space-xs">Huỷ đơn đã đóng gói sẽ trả hàng về kho.</p>}
          </Section>
        )}

        <Section title={`Sản phẩm (${order.items.length})`}>
          <div className="divide-y divide-line">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-space-sm py-space-xs">
                {item.imageUrl
                  ? <img src={resolveCatalogImageUrl(item.imageUrl)} alt="" className="w-12 h-12 rounded-lg object-cover bg-surface-container-low flex-shrink-0" />
                  : <span className="w-12 h-12 rounded-lg bg-surface-container-low flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-title-md text-title-md truncate" title={item.productNameSnapshot}>{item.productNameSnapshot}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant">
                    {[describeAttributes(item.variantAttributesSnapshot), `${formatVnd(item.unitPrice)} × ${item.quantity}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <strong className="whitespace-nowrap">{formatVnd(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="border-t border-line mt-space-xs pt-space-xs space-y-0.5 font-body-md text-body-md">
            <Row label="Tạm tính">{formatVnd(order.subtotalAmount)}</Row>
            <Row label="Giảm giá">- {formatVnd(order.discountAmount)}</Row>
            <Row label="Phí vận chuyển">{formatVnd(order.shippingFeeAmount)}</Row>
            <div className="flex justify-between font-title-md text-title-md"><span>Tổng cộng</span><span className="text-primary">{formatVnd(order.totalAmount)}</span></div>
          </div>
        </Section>

        <Section title="Thanh toán">
          {order.payment ? (
            <div className="flex flex-wrap items-center justify-between gap-space-xs font-body-md text-body-md">
              <span>{PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}</span>
              <span className={statusPillClass(order.payment.status === 'paid' ? 'active' : order.payment.status === 'pending' ? 'locked' : 'deleted')}>
                {PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}
                {order.payment.paidAt && ` · ${dateTime.format(new Date(order.payment.paidAt))}`}
              </span>
            </div>
          ) : <p className="text-on-surface-variant">Chưa có thông tin thanh toán.</p>}
          {(order.refunds ?? []).length > 0 && (
            <div className="border-t border-line mt-space-xs pt-space-xs space-y-space-xs font-body-md text-body-md">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md">Hoàn tiền</span>
                {canAccessSection('/admin/hoan-tien', (department ?? null) as Department | null) && <Link className={a.linkButton} to="/admin/hoan-tien">Mở trang Hoàn tiền →</Link>}
              </div>
              {order.refunds.map((refund) => (
                <div key={refund.id} className="flex flex-wrap items-center justify-between gap-space-xs">
                  <span>{refund.kind === 'cancellation' ? REFUND_KIND_LABEL.cancellation : refund.productName ?? REFUND_KIND_LABEL.return}</span>
                  <span className="flex items-center gap-space-xs">
                    <span className={statusPillClass(REFUND_STATUS_TONE[refund.status] === 'success' ? 'active' : REFUND_STATUS_TONE[refund.status] === 'danger' ? 'deleted' : 'info')}>{REFUND_STATUS_LABEL[refund.status]}</span>
                    <strong>{formatVnd(refund.refundAmount ?? 0)}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Khách hàng & giao hàng">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-md gap-y-space-xs font-body-md text-body-md">
            <Field label="Tài khoản">{customer?.fullName ?? '—'}</Field>
            <Field label="Email / SĐT">{customer ? [customer.email, customer.phone].filter(Boolean).join(' · ') || '—' : '—'}</Field>
            <Field label="Người nhận">{customer ? `${customer.recipientName ?? '—'} · ${customer.recipientPhone ?? '—'}` : '—'}</Field>
            <Field label="Địa chỉ giao">{order.shippingAddressSnapshot}</Field>
            <Field label="Kho xuất">{warehouses.find((w) => w.id === order.warehouseId)?.name ?? (order.warehouseId ? 'Đã chọn' : 'Chưa chọn')}</Field>
            <Field label="Vận chuyển">{[order.shippingProviderName, order.trackingNo].filter(Boolean).join(' · ') || '—'}</Field>
          </dl>
        </Section>

        <Section title="Hành trình đơn hàng">
          <ol className="space-y-space-xs">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="border-l-2 border-primary pl-space-sm">
                <div className="font-title-md text-title-md">{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</div>
                <div className="font-label-md text-label-md text-on-surface-variant">
                  {dateTime.format(new Date(h.changedAt))} · {h.changedByType === 'buyer' ? 'Khách hàng' : h.changedByType === 'system' ? 'Hệ thống' : 'Nhân viên'}
                </div>
                {h.reason && <div className="font-body-md text-body-md">{h.reason}</div>}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-xl p-space-md ${accent ? 'bg-primary-fixed/40 ring-1 ring-primary/30' : 'bg-surface-container-low'}`}>
      <h3 className="font-title-md text-title-md mb-space-xs">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex justify-between"><span className="text-on-surface-variant">{label}</span><span>{children}</span></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-label-md text-label-md text-on-surface-variant">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
