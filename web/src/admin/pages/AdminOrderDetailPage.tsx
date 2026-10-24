import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

/** One order for staff: who bought what, where it goes, its history, and the next step for this department. */
export default function AdminOrderDetailPage() {
  const { id = '' } = useParams()
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
    if (!token || !id) return
    apiFetch<StaffOrderDetail>(`/orders/${id}`, {}, token)
      .then((data) => {
        setOrder(data)
        setTrackingNo(data.trackingNo ?? '')
        if (data.warehouseId) setWarehouseId(data.warehouseId)
        if (data.shippingProviderName) setProvider(data.shippingProviderName)
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đơn hàng'))
  }, [token, id])

  useEffect(load, [load])
  useEffect(() => {
    if (!token || !canShip) return
    apiFetch<Warehouse[]>('/api/catalog/warehouses', {}, token).then(setWarehouses).catch(() => setWarehouses([]))
  }, [token, canShip])

  const run = async (path: string, body: unknown) => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token)
      load()
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
        message: <>Huỷ đơn <strong>{orderCode(id)}</strong>? Lý do được lưu vào hành trình đơn và khách sẽ thấy.{order?.payment?.status === 'paid' ? ' Khách đã thanh toán — hệ thống sẽ tạo yêu cầu hoàn tiền cho CSKH.' : ''}</>,
        label: 'Lý do huỷ', type: 'textarea', placeholder: 'VD: Khách yêu cầu huỷ, hết hàng…',
        confirmLabel: 'Huỷ đơn', cancelLabel: 'Quay lại', tone: 'danger',
      })
      if (reason == null) return
    } else if (ask === 'keep') {
      reason = await prompt({
        title: 'Từ chối yêu cầu huỷ',
        message: <>Giữ đơn <strong>{orderCode(id)}</strong> ở trạng thái đã xác nhận. Khách sẽ thấy lý do trong hành trình đơn.</>,
        label: 'Lý do từ chối', type: 'textarea', placeholder: 'VD: Đơn đã đóng gói, sắp bàn giao vận chuyển…',
        confirmLabel: 'Từ chối huỷ', cancelLabel: 'Quay lại',
      })
      if (reason == null) return
    }
    void run(`/orders/${id}/status`, { status, reason })
  }

  const confirmTransfer = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã nhận tiền',
      message: <>Đã đối chiếu sao kê và nhận đủ <strong>{formatVnd(order?.payment?.amount ?? 0)}</strong> cho đơn <strong>{orderCode(id)}</strong>? Nếu đơn bị huỷ sau đó, khách sẽ được hoàn tiền.</>,
      confirmLabel: 'Đã nhận tiền',
    })
    if (ok) void run(`/orders/${id}/payment-received`, {})
  }

  if (error && !order) return <div><Link className={a.linkButton} to="/admin/don-hang">← Danh sách đơn hàng</Link><p role="alert" className="text-error mt-space-md">{error}</p></div>
  if (!order) return <p>Đang tải đơn hàng…</p>

  const customer = order.customer
  const canPack = canShip && order.status === 'confirmed' && (order.shipmentStatus === 'pending' || order.shipmentStatus === 'packed')
  const decisions = canDecide && ['pending', 'confirmed', 'cancel_requested'].includes(order.status)

  return (
    <div>
      <Link className={a.linkButton} to="/admin/don-hang">← Danh sách đơn hàng</Link>
      <div className={`${a.toolbar} mt-space-sm`}>
        <h1 className="!mb-0">Đơn {orderCode(order.id)}</h1>
        <div className="flex items-center gap-space-xs">
          <span className={statusPillClass(ORDER_STATUS_TONE[order.status])}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
          <span className={statusPillClass('info')}>{SHIPMENT_STATUS_LABEL[order.shipmentStatus] ?? order.shipmentStatus}</span>
        </div>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">Đặt lúc {dateTime.format(new Date(order.createdAt))}</p>
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md items-start">
        <div className="lg:col-span-2 space-y-space-md">
          <section className={a.card}>
            <h2 className="font-headline-md text-headline-md mb-space-sm">Sản phẩm ({order.items.length})</h2>
            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-space-md py-space-sm">
                  {item.imageUrl
                    ? <img src={resolveCatalogImageUrl(item.imageUrl)} alt="" className="w-16 h-16 rounded-lg object-cover bg-surface-container-low flex-shrink-0" />
                    : <span className="w-16 h-16 rounded-lg bg-surface-container-low flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-title-md text-title-md">{item.productNameSnapshot}</div>
                    {describeAttributes(item.variantAttributesSnapshot) && (
                      <div className="font-label-md text-label-md text-on-surface-variant">{describeAttributes(item.variantAttributesSnapshot)}</div>
                    )}
                    <div className="font-body-md text-body-md text-on-surface-variant">{formatVnd(item.unitPrice)} × {item.quantity}</div>
                  </div>
                  <strong className="whitespace-nowrap">{formatVnd(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
            <div className="border-t border-line mt-space-sm pt-space-sm space-y-1 font-body-md text-body-md">
              <div className="flex justify-between"><span>Tạm tính</span><span>{formatVnd(order.subtotalAmount)}</span></div>
              <div className="flex justify-between"><span>Giảm giá</span><span>- {formatVnd(order.discountAmount)}</span></div>
              <div className="flex justify-between"><span>Phí vận chuyển</span><span>{formatVnd(order.shippingFeeAmount)}</span></div>
              <div className="flex justify-between font-title-md text-title-md"><span>Tổng cộng</span><span className="text-primary">{formatVnd(order.totalAmount)}</span></div>
            </div>
            {order.payment && (
              <div className="border-t border-line mt-space-sm pt-space-sm flex flex-wrap items-center justify-between gap-space-xs font-body-md text-body-md">
                <span>{PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}</span>
                <span className="flex flex-wrap items-center gap-space-xs">
                  <span className={statusPillClass(order.payment.status === 'paid' ? 'active' : order.payment.status === 'pending' ? 'locked' : 'deleted')}>
                    {PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}
                    {order.payment.paidAt && ` · ${dateTime.format(new Date(order.payment.paidAt))}`}
                  </span>
                  {canDecide && order.payment.method === 'bank_transfer' && order.payment.status === 'pending' && (
                    <button type="button" className={buttonClass('primary', 'sm')} disabled={busy} onClick={() => void confirmTransfer()}>Xác nhận đã nhận tiền</button>
                  )}
                </span>
              </div>
            )}
            {(order.refunds ?? []).length > 0 && (
              <div className="border-t border-line mt-space-sm pt-space-sm space-y-space-xs font-body-md text-body-md">
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
          </section>

          <section className={a.card}>
            <h2 className="font-headline-md text-headline-md mb-space-sm">Hành trình đơn hàng</h2>
            <ol className="space-y-space-sm">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-primary pl-space-sm">
                  <div className="font-title-md text-title-md">{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant">
                    {dateTime.format(new Date(h.changedAt))} · {h.changedByType === 'buyer' ? 'Khách hàng' : 'Nhân viên'}
                  </div>
                  {h.reason && <div className="font-body-md text-body-md">{h.reason}</div>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-space-md">
          <section className={a.card}>
            <h2 className="font-headline-md text-headline-md mb-space-sm">Khách hàng</h2>
            {customer ? (
              <dl className="space-y-1 font-body-md text-body-md">
                <div><dt className="text-on-surface-variant font-label-md text-label-md">Tài khoản</dt><dd>{customer.fullName ?? '—'}</dd></div>
                <div><dt className="text-on-surface-variant font-label-md text-label-md">Email / SĐT</dt><dd>{[customer.email, customer.phone].filter(Boolean).join(' · ') || '—'}</dd></div>
                <div><dt className="text-on-surface-variant font-label-md text-label-md">Người nhận</dt><dd>{customer.recipientName ?? '—'} · {customer.recipientPhone ?? '—'}</dd></div>
              </dl>
            ) : <p className="text-on-surface-variant">Không còn thông tin địa chỉ của đơn này.</p>}
            <div className="mt-space-sm"><dt className="text-on-surface-variant font-label-md text-label-md">Địa chỉ giao</dt><dd>{order.shippingAddressSnapshot}</dd></div>
          </section>

          <section className={a.card}>
            <h2 className="font-headline-md text-headline-md mb-space-sm">Giao hàng</h2>
            <dl className="space-y-1 font-body-md text-body-md mb-space-sm">
              <div><dt className="text-on-surface-variant font-label-md text-label-md">Kho xuất</dt><dd>{warehouses.find((w) => w.id === order.warehouseId)?.name ?? (order.warehouseId ? 'Đã chọn' : 'Chưa chọn')}</dd></div>
              <div><dt className="text-on-surface-variant font-label-md text-label-md">Đơn vị vận chuyển</dt><dd>{order.shippingProviderName ?? '—'}</dd></div>
              <div><dt className="text-on-surface-variant font-label-md text-label-md">Mã vận đơn</dt><dd>{order.trackingNo ?? '—'}</dd></div>
            </dl>

            {canPack && (
              <div className="space-y-space-xs border-t border-line pt-space-sm">
                <label className="block font-label-md text-label-md">Kho xuất hàng
                  <select className={a.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    <option value="">Chọn kho</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </label>
                <label className="block font-label-md text-label-md">Đơn vị vận chuyển
                  <input className={a.input} value={provider} onChange={(e) => setProvider(e.target.value)} />
                </label>
                <button type="button" className={buttonClass('primary', 'sm')} disabled={busy || !warehouseId || !provider.trim()}
                  onClick={() => void run(`/orders/${id}/shipping-info`, { warehouseId, shippingProviderName: provider.trim() })}>
                  {order.shipmentStatus === 'packed' ? 'Cập nhật đóng gói' : 'Đóng gói & xuất kho'}
                </button>
              </div>
            )}
            {canShip && order.shipmentStatus === 'packed' && order.status === 'confirmed' && (
              <div className="space-y-space-xs border-t border-line pt-space-sm mt-space-sm">
                <label className="block font-label-md text-label-md">Mã vận đơn
                  <input className={a.input} value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="VD: GHN123456" />
                </label>
                <button type="button" className={buttonClass('primary', 'sm')} disabled={busy || !trackingNo.trim()}
                  onClick={() => void run(`/orders/${id}/tracking`, { trackingNo: trackingNo.trim(), shipmentStatus: 'shipping' })}>
                  Bàn giao vận chuyển (Đang giao)
                </button>
              </div>
            )}
            {canShip && order.status === 'shipping' && (
              <div className="border-t border-line pt-space-sm mt-space-sm">
                <button type="button" className={buttonClass('primary', 'sm')} disabled={busy}
                  onClick={() => void run(`/orders/${id}/tracking`, { trackingNo: order.trackingNo ?? trackingNo, shipmentStatus: 'delivered' })}>
                  Xác nhận đã giao
                </button>
              </div>
            )}
          </section>

          {decisions && (
            <section className={a.card}>
              <h2 className="font-headline-md text-headline-md mb-space-sm">Xử lý đơn</h2>
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
              {order.shipmentStatus === 'packed' && <p className="font-label-md text-label-md text-on-surface-variant mt-space-xs">Huỷ đơn đã đóng gói sẽ trả hàng về kho.</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
