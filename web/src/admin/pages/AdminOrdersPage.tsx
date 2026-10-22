import { useMemo, useState } from 'react'
import { INITIAL_ORDERS, ORDER_STATUS_LABEL, type OrderRow, type OrderStatus } from '../data/sampleOrders'
import { formatVnd } from '../../data/sampleProducts'
import { a, chipClass, statusPillClass, pageButtonClass } from '../adminUi'

const STATUS_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

const STATUS_PILL_TONE: Record<OrderStatus, 'active' | 'locked' | 'deleted' | 'info'> = {
  pending: 'locked',
  confirmed: 'info',
  shipping: 'info',
  delivered: 'active',
  cancelled: 'deleted',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>(INITIAL_ORDERS)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const matchSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [orders, statusFilter, searchQuery])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filtered.slice(startIndex, startIndex + itemsPerPage)

  const updateStatus = (id: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    )
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Đơn hàng ({filtered.length})</h1>
        <input 
          type="text" 
          placeholder="Tìm mã đơn, khách hàng..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`${a.input} max-w-[300px] !rounded-full`}
        />
      </div>

      <div className={`${a.filterBar} mb-space-md`}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={chipClass(statusFilter === f.value)}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Ngày đặt</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Không tìm thấy đơn hàng nào.</td>
              </tr>
            ) : (
              paginatedOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customerName}</td>
                  <td>{o.itemCount}</td>
                  <td>{formatVnd(o.total)}</td>
                  <td>{o.createdAt}</td>
                  <td>
                    <span className={statusPillClass(STATUS_PILL_TONE[o.status])}>{ORDER_STATUS_LABEL[o.status]}</span>
                  </td>
                  <td>
                    <select 
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                      className="!w-auto cursor-pointer"
                    >
                      {STATUS_FILTERS.filter(f => f.value !== 'all').map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-space-lg">
          <button 
            className={pageButtonClass(false)} 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            &lt;
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={pageButtonClass(currentPage === page)}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button 
            className={pageButtonClass(false)} 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            &gt;
          </button>
        </div>
      )}

      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        Dữ liệu minh hoạ - sẽ ghi <code>OrderStatusHistory</code> thật mỗi khi đổi trạng thái khi có API domain Order.
      </p>
    </div>
  )
}
