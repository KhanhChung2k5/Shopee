import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import { isP3DemoMode } from '../demo/p3DemoApi'
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from '../state/AuthContext'

type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'

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
}

interface StatusUpdateResponse {
  orderId: string
  previousStatus: OrderStatus
  status: OrderStatus
  change: StatusHistoryEntry
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancel_requested: 'Chờ xác nhận huỷ',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}

const SHIPMENT_LABEL: Record<string, string> = {
  pending: 'Chờ đóng gói',
  packed: 'Đã đóng gói',
  shipping: 'Đang vận chuyển',
  delivered: 'Đã giao hàng',
  failed: 'Giao không thành công',
}

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
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
    return <div className="container"><div className="order-detail-state">Đang kiểm tra đăng nhập…</div></div>
  }
  if (!isAuthenticated || !token) {
    return <Navigate to="/dang-nhap" replace state={{ from: id ? `/don-hang/${id}` : '/don-hang' }} />
  }
  if (user?.role === 'staff') {
    return <Navigate to="/admin/don-hang" replace />
  }
  if (!id || !UUID_PATTERN.test(id)) {
    return (
      <div className="container"><div className="order-detail-state">
        <h1>Đường dẫn đơn hàng không hợp lệ</h1>
        <Link className="button button--outline" to="/don-hang">Về lịch sử đơn hàng</Link>
      </div></div>
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
  const [isAdvancingDemo, setIsAdvancingDemo] = useState(false)

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

  const advanceDemoOrder = async () => {
    setIsAdvancingDemo(true)
    setError(null)
    try {
      const updated = await apiFetch<OrderDetail>(`/demo/orders/${orderId}/advance`, { method: 'PATCH' }, token)
      setOrder(updated)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể mô phỏng trạng thái tiếp theo')
    } finally {
      setIsAdvancingDemo(false)
    }
  }

  if (isLoading) {
    return <div className="container"><div className="order-detail-state">Đang tải chi tiết đơn hàng…</div></div>
  }

  if (error || !order) {
    return (
      <div className="container"><div className="order-detail-state order-detail-state--error">
        <h1>Không thể mở đơn hàng</h1>
        <p>{error ?? 'Không tìm thấy đơn hàng'}</p>
        <div className="order-detail-state__actions">
          <Link className="button button--outline" to="/don-hang">Về lịch sử đơn hàng</Link>
          <button className="button button--primary" type="button" onClick={retry}>Thử lại</button>
        </div>
      </div></div>
    )
  }

  const canCancel = order.status === 'pending' || order.status === 'confirmed'
  const canAdvanceDemo = order.status === 'pending'
    || order.status === 'confirmed'
    || order.status === 'cancel_requested'
    || order.status === 'shipping'

  return (
    <div className="container order-detail-page">
      <Link className="order-detail-back" to="/don-hang">← Lịch sử đơn hàng</Link>

      {/* P3-DEMO-INTEGRATION-SEAM: temporary P2/P5 staff-action simulator. */}
      {isP3DemoMode() && (
        <section className="p3-demo-panel">
          <p>
            <strong>Điều khiển demo:</strong> mô phỏng nhân viên/kho/vận chuyển để kiểm tra timeline và tracking của P3.
          </p>
          <button
            className="button button--outline button--sm"
            type="button"
            disabled={!canAdvanceDemo || isAdvancingDemo}
            onClick={() => void advanceDemoOrder()}
          >
            {isAdvancingDemo
              ? 'Đang cập nhật…'
              : order.status === 'cancel_requested'
                ? 'Mô phỏng nhân viên xác nhận huỷ'
                : canAdvanceDemo ? 'Mô phỏng bước tiếp theo' : 'Đã đến trạng thái cuối'}
          </button>
        </section>
      )}

      <header className="order-detail-heading">
        <div>
          <p className="order-history-eyebrow">Chi tiết đơn hàng</p>
          <h1>Đơn #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p>Đặt lúc {formatDate(order.createdAt)}</p>
        </div>
        <span className={`order-status order-status--${order.status}`}>{STATUS_LABEL[order.status]}</span>
      </header>

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <section className="order-detail-section">
            <h2>Sản phẩm ({order.items.length})</h2>
            <div className="order-detail-items">
              {order.items.map((item, index) => {
                const attributes = formatAttributes(item.variantAttributesSnapshot)
                return (
                  <div className="order-detail-item" key={item.id}>
                    <div className="order-detail-item__thumb">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productNameSnapshot} loading="lazy" />
                      ) : (
                        <span aria-hidden="true">{index + 1}</span>
                      )}
                    </div>
                    <div className="order-detail-item__body">
                      <strong>{item.productNameSnapshot}</strong>
                      {attributes && <span>{attributes}</span>}
                      <span>{formatVnd(Number(item.unitPrice))} × {item.quantity}</span>
                    </div>
                    <strong className="order-detail-item__total">{formatVnd(Number(item.lineTotal))}</strong>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="order-detail-section">
            <h2>Hành trình đơn hàng</h2>
            <ol className="order-timeline">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className={`order-timeline__item order-timeline__item--${entry.status}`}>
                  <div className="order-timeline__dot" aria-hidden="true" />
                  <div>
                    <strong>{STATUS_LABEL[entry.status] ?? entry.status}</strong>
                    <span>{formatDate(entry.changedAt)} · {entry.changedByType === 'buyer' ? 'Khách hàng' : 'Nhân viên'}</span>
                    {entry.reason && <p>{entry.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="order-detail-side">
          <section className="order-detail-section">
            <h2>Giao hàng</h2>
            <dl className="order-detail-info">
              <div><dt>Địa chỉ</dt><dd>{order.shippingAddressSnapshot}</dd></div>
              <div><dt>Trạng thái</dt><dd>{SHIPMENT_LABEL[order.shipmentStatus] ?? order.shipmentStatus}</dd></div>
              {order.shippingProviderName && <div><dt>Đơn vị vận chuyển</dt><dd>{order.shippingProviderName}</dd></div>}
              {order.trackingNo && <div><dt>Mã vận đơn</dt><dd><code>{order.trackingNo}</code></dd></div>}
            </dl>
          </section>

          <section className="order-detail-section">
            <h2>Thanh toán</h2>
            <div className="order-detail-prices">
              <div><span>Tạm tính</span><span>{formatVnd(Number(order.subtotalAmount))}</span></div>
              <div><span>Giảm giá</span><span>− {formatVnd(Number(order.discountAmount))}</span></div>
              <div><span>Phí vận chuyển</span><span>{formatVnd(Number(order.shippingFeeAmount))}</span></div>
              <div className="order-detail-prices__total"><span>Tổng cộng</span><strong>{formatVnd(Number(order.totalAmount))}</strong></div>
            </div>
          </section>

          {canCancel && (
            <section className="order-detail-section order-detail-cancel">
              {!showCancelForm ? (
                <button className="button button--outline order-detail-cancel__open" type="button" onClick={() => setShowCancelForm(true)}>
                  Gửi yêu cầu huỷ đơn
                </button>
              ) : (
                <div className="order-detail-cancel__form">
                  <label htmlFor="cancel-reason">Lý do huỷ đơn</label>
                  <textarea
                    id="cancel-reason"
                    maxLength={500}
                    rows={4}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Cho chúng tôi biết lý do bạn muốn huỷ…"
                    disabled={isCancelling}
                  />
                  <span className="order-detail-cancel__count">{cancelReason.length}/500</span>
                  {cancelError && <p role="alert">{cancelError}</p>}
                  <div>
                    <button className="button button--outline button--sm" type="button" disabled={isCancelling} onClick={() => { setShowCancelForm(false); setCancelError(null) }}>Giữ đơn</button>
                    <button className="button button--primary button--sm" type="button" disabled={isCancelling || !cancelReason.trim()} onClick={() => void cancelOrder()}>
                      {isCancelling ? 'Đang gửi…' : 'Gửi yêu cầu huỷ'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {order.status === 'cancel_requested' && (
            <section className="order-detail-section order-detail-cancel-waiting">
              <strong>Yêu cầu huỷ đang chờ xác nhận</strong>
              <p>Đơn hàng chưa bị huỷ. Người bán hoặc nhân viên phụ trách sẽ xem xét và xác nhận yêu cầu.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
