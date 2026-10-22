import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert, Badge, Button, ButtonLink, Card, Chip, EmptyState, Loading, Page, PageHeader } from '../components/ui'
import { formatVnd } from '../lib/catalog'
import { apiFetch, ApiError } from '../lib/api'
import { SHIPMENT_LABEL, STATUS_LABEL, STATUS_TONE, formatOrderDate, shortOrderId, type OrderStatus } from '../lib/orderStatus'
import { useAuth } from '../state/AuthContext'

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

export default function OrderHistoryPage() {
  const { token, user, isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return <Page><Loading>Đang kiểm tra đăng nhập…</Loading></Page>
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
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Tài khoản', to: '/ho-so' }, { label: 'Đơn mua' }]}
        title="Lịch sử đơn hàng"
        actions={<ButtonLink variant="outline" size="sm" icon="storefront" to="/">Tiếp tục mua sắm</ButtonLink>}
      />

      <div className="flex items-center gap-space-xs overflow-x-auto pb-1" role="group" aria-label="Lọc đơn hàng theo trạng thái">
        {STATUS_FILTERS.map((filter) => (
          <Chip key={filter.value} active={status === filter.value} onClick={() => selectStatus(filter.value)}>
            {filter.label}
          </Chip>
        ))}
      </div>

      {error && (
        <Alert>
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <span>{error}</span>
            <Button variant="outline" size="sm" icon="refresh" onClick={retry}>Thử lại</Button>
          </div>
        </Alert>
      )}

      {!error && isLoading && <Loading>Đang tải đơn hàng…</Loading>}

      {!error && !isLoading && orders.length === 0 && (
        <Card>
          <EmptyState
            icon="receipt_long"
            title="Chưa có đơn hàng"
            description={status === 'all'
              ? 'Các đơn bạn đã đặt sẽ xuất hiện tại đây.'
              : `Không có đơn nào ở trạng thái “${STATUS_FILTERS.find((filter) => filter.value === status)?.label}”.`}
            action={<ButtonLink to="/">Khám phá sản phẩm</ButtonLink>}
          />
        </Card>
      )}

      {!error && !isLoading && orders.length > 0 && (
        <div className="space-y-space-sm">
          {orders.map((order) => (
            <Card as="article" className="!p-0 overflow-hidden hover:shadow-md transition-shadow" key={order.id}>
              <header className="flex items-center justify-between gap-space-sm px-space-lg py-space-sm border-b border-line">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant">Mã đơn</span>
                  <strong className="font-title-md text-title-md text-on-surface" title={order.id}>#{shortOrderId(order.id)}</strong>
                </div>
                <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
              </header>

              <dl className="grid grid-cols-2 md:grid-cols-4 gap-space-md px-space-lg py-space-md">
                <Metric label="Ngày đặt" value={formatOrderDate(order.createdAt)} />
                <Metric label="Sản phẩm" value={`${order.itemCount} mặt hàng`} />
                <Metric label="Vận chuyển" value={SHIPMENT_LABEL[order.shipmentStatus] ?? order.shipmentStatus} />
                <Metric label="Tổng thanh toán" value={<span className="font-price-md text-price-md text-primary">{formatVnd(Number(order.totalAmount))}</span>} />
              </dl>

              <footer className="flex flex-wrap items-center justify-between gap-space-sm px-space-lg py-space-sm bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant break-all">Mã tham chiếu: {order.id}</span>
                <Link className="flex items-center gap-0.5 font-title-md text-title-md text-primary hover:underline" to={`/don-hang/${order.id}`}>
                  Xem chi tiết <span className="material-symbols-outlined text-base">chevron_right</span>
                </Link>
              </footer>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="font-label-md text-label-md text-on-surface-variant">{label}</dt>
      <dd className="font-title-md text-title-md text-on-surface">{value}</dd>
    </div>
  )
}
