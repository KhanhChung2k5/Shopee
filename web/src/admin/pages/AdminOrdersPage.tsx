import { useMemo, useState } from 'react'
import { INITIAL_ORDERS, ORDER_STATUS_LABEL, type OrderRow, type OrderStatus } from '../data/sampleOrders'
import { formatVnd } from '../../data/sampleProducts'

const STATUS_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

const STATUS_PILL_CLASS: Record<OrderStatus, string> = {
  pending: 'status-pill--locked',
  confirmed: 'status-pill--active',
  shipping: 'status-pill--active',
  delivered: 'status-pill--active',
  cancelled: 'status-pill--deleted',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>(INITIAL_ORDERS)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  const filtered = useMemo(
    () => orders.filter((o) => statusFilter === 'all' || o.status === statusFilter),
    [orders, statusFilter],
  )

  const advanceStatus = (id: string) => {
    const order = STATUS_FILTERS.map((f) => f.value).filter((v) => v !== 'all') as OrderStatus[]
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o
        const idx = order.indexOf(o.status)
        const next = idx >= 0 && idx < order.length - 2 ? order[idx + 1] : o.status
        return { ...o, status: next }
      }),
    )
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ margin: 0 }}>Đơn hàng ({filtered.length}/{orders.length})</h1>
      </div>

      <div className="filter-bar">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`filter-chip${statusFilter === f.value ? ' filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Số sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Ngày đặt</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customerName}</td>
                <td>{o.itemCount}</td>
                <td>{formatVnd(o.total)}</td>
                <td>{o.createdAt}</td>
                <td>
                  <span className={`status-pill ${STATUS_PILL_CLASS[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                </td>
                <td>
                  <button
                    className="button button--outline button--sm"
                    type="button"
                    disabled={o.status === 'delivered' || o.status === 'cancelled'}
                    onClick={() => advanceStatus(o.id)}
                  >
                    Chuyển trạng thái tiếp
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Dữ liệu minh hoạ — sẽ ghi <code>OrderStatusHistory</code> thật mỗi khi đổi trạng thái khi có API domain Order.
      </p>
    </div>
  )
}
