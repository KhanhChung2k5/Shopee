import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { a, chipClass, statusPillClass, pageButtonClass } from '../adminUi'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, orderCode, type OrderStatus, type StaffOrderSummary } from '../orders'

const STATUS_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'cancel_requested', label: 'Yêu cầu huỷ' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

const PAGE_SIZE = 10
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

/** Real order board for sales / warehouse / admin; click a row to open the order. */
export default function AdminOrdersPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<StaffOrderSummary[] | null>(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!token) return
    apiFetch<StaffOrderSummary[]>('/orders', {}, token)
      .then((data) => { setOrders(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đơn hàng'))
  }, [token])

  const counts = useMemo(() => {
    const result: Partial<Record<OrderStatus, number>> = {}
    for (const order of orders ?? []) result[order.status] = (result[order.status] ?? 0) + 1
    return result
  }, [orders])

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase('vi')
    return (orders ?? []).filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const haystack = [orderCode(o.id), o.id, o.customer?.fullName, o.customer?.email, o.customer?.phone,
        o.customer?.recipientName, o.customer?.recipientPhone].filter(Boolean).join(' ').toLocaleLowerCase('vi')
      return matchStatus && (!term || haystack.includes(term))
    })
  }, [orders, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Đơn hàng ({filtered.length})</h1>
        <input
          type="search"
          placeholder="Tìm mã đơn, tên, email, SĐT..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
          className={`${a.input} max-w-[300px] !rounded-full`}
        />
      </div>

      <div className={`${a.filterBar} mb-space-md`}>
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} type="button" className={chipClass(statusFilter === f.value)}
            onClick={() => { setStatusFilter(f.value); setCurrentPage(1) }}>
            {f.label}{f.value !== 'all' && counts[f.value] ? ` (${counts[f.value]})` : ''}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Ngày đặt</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {!orders && !error && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Đang tải đơn hàng…</td></tr>}
            {orders && visible.length === 0 && (
              <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Không tìm thấy đơn hàng nào.</td></tr>
            )}
            {visible.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-surface-container-low" onClick={() => navigate(`/admin/don-hang/${o.id}`)}>
                <td><button type="button" className={a.linkButton} onClick={(e) => { e.stopPropagation(); navigate(`/admin/don-hang/${o.id}`) }}>{orderCode(o.id)}</button></td>
                <td>
                  <div className="font-semibold">{o.customer?.fullName ?? o.customer?.recipientName ?? '—'}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant">{o.customer?.email ?? o.customer?.recipientPhone ?? ''}</div>
                </td>
                <td>{o.itemCount}</td>
                <td>{formatVnd(o.totalAmount)}</td>
                <td className="whitespace-nowrap">{dateTime.format(new Date(o.createdAt))}</td>
                <td><span className={statusPillClass(ORDER_STATUS_TONE[o.status])}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-space-lg">
          <button className={pageButtonClass(false)} disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>&lt;</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={pageButtonClass(page === p)} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button className={pageButtonClass(false)} disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>&gt;</button>
        </div>
      )}
    </div>
  )
}
