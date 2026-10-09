import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from '../state/AuthContext'

type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'
type StatusFilter = OrderStatus | 'all'

interface OrderSummary {
  id: string
  totalAmount: number
  status: OrderStatus
  shipmentStatus: string
  itemCount: number
  createdAt: string
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Chờ giao hàng' },
  { value: 'shipping', label: 'Vận chuyển' },
  { value: 'delivered', label: 'Hoàn thành' },
  { value: 'cancel_requested', label: 'Chờ xác nhận huỷ' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

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

function formatOrderDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export default function OrderHistoryPage() {
  const { token, user, isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return <div className="container"><div className="order-history-state">Đang kiểm tra đăng nhập…</div></div>
  }
  if (!isAuthenticated || !token) {
    return <Navigate to="/dang-nhap" replace state={{ from: '/don-hang' }} />
  }
  if (user?.role === 'staff') {
    return <Navigate to="/admin/don-hang" replace />
  }

  return <OrderHistoryContent token={token} />
}

function OrderHistoryContent({ token }: { token: string }) {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const query = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`

    apiFetch<OrderSummary[]>(`/orders${query}`, { signal: controller.signal }, token)
      .then((data) => {
        if (active) setOrders(data)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(requestError instanceof ApiError ? requestError.message : 'Không tải được lịch sử đơn hàng')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [status, retryKey, token])

  const selectStatus = (nextStatus: StatusFilter) => {
    if (nextStatus === status) return
    setIsLoading(true)
    setError(null)
    setStatus(nextStatus)
  }

  const retry = () => {
    setIsLoading(true)
    setError(null)
    setRetryKey((key) => key + 1)
  }

  return (
    <div className="container order-history-page">
      <div className="order-history-heading">
        <div>
          <p className="order-history-eyebrow">Tài khoản của tôi</p>
          <h1 className="section-title">Lịch sử đơn hàng</h1>
        </div>
        <Link className="button button--outline button--sm" to="/">Tiếp tục mua sắm</Link>
      </div>

      <div className="order-history-filters" role="group" aria-label="Lọc đơn hàng theo trạng thái">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`order-history-filter${status === filter.value ? ' order-history-filter--active' : ''}`}
            onClick={() => selectStatus(filter.value)}
            aria-pressed={status === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="order-history-state order-history-state--error" role="alert">
          <p>{error}</p>
          <button className="button button--outline button--sm" type="button" onClick={retry}>
            Thử lại
          </button>
        </div>
      )}

      {!error && isLoading && <div className="order-history-state" aria-live="polite">Đang tải đơn hàng…</div>}

      {!error && !isLoading && orders.length === 0 && (
        <div className="order-history-state">
          <div className="order-history-state__icon" aria-hidden="true">⌁</div>
          <h2>Chưa có đơn hàng</h2>
          <p>
            {status === 'all'
              ? 'Các đơn bạn đã đặt sẽ xuất hiện tại đây.'
              : `Không có đơn nào ở trạng thái “${STATUS_FILTERS.find((filter) => filter.value === status)?.label}”.`}
          </p>
          <Link className="button button--primary" to="/">Khám phá sản phẩm</Link>
        </div>
      )}

      {!error && !isLoading && orders.length > 0 && (
        <div className="order-history-list">
          {orders.map((order) => (
            <article className="order-history-card" key={order.id}>
              <header className="order-history-card__header">
                <div>
                  <span className="order-history-card__label">Mã đơn</span>
                  <strong title={order.id}>#{shortOrderId(order.id)}</strong>
                </div>
                <span className={`order-status order-status--${order.status}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </header>

              <div className="order-history-card__body">
                <div className="order-history-card__metric"><span>Ngày đặt</span><strong>{formatOrderDate(order.createdAt)}</strong></div>
                <div className="order-history-card__metric"><span>Sản phẩm</span><strong>{order.itemCount} mặt hàng</strong></div>
                <div className="order-history-card__metric"><span>Vận chuyển</span><strong>{SHIPMENT_LABEL[order.shipmentStatus] ?? order.shipmentStatus}</strong></div>
                <div className="order-history-card__metric order-history-card__metric--total"><span>Tổng thanh toán</span><strong>{formatVnd(Number(order.totalAmount))}</strong></div>
              </div>

              <footer className="order-history-card__footer">
                <span>Mã tham chiếu: {order.id}</span>
                <Link className="order-history-card__detail" to={`/don-hang/${order.id}`}>Xem chi tiết →</Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
