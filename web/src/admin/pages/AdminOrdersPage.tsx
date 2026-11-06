import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { a, chipClass, statusPillClass, pageButtonClass } from '../adminUi'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, awaitsTransfer, isStaleOrder, orderAgeDays, orderCode, paymentShort, type OrderStatus, type StaffOrderSummary } from '../orders'
import OrderDetailPanel from '../components/OrderDetailPanel'
import { RecentViews, SearchBox } from '../components/ListSearch'
import { useRecentViews } from '../components/listSearchState'

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

/**
 * Order board for sales / warehouse / admin as a list + detail view: clicking a row opens the order in a panel on
 * the right (URL /admin/don-hang/:id, so links and reload still work) while the list, its filters and scroll stay put.
 * ↑ / ↓ move to the previous / next order, Esc closes the panel. On narrow screens the panel slides over the list.
 */
export default function AdminOrdersPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id: selectedId } = useParams()
  const [orders, setOrders] = useState<StaffOrderSummary[] | null>(null)
  const [error, setError] = useState('')
  // ?trangthai=pending&treo=1 — the dashboard's stale-order warning links here.
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(() => {
    const status = searchParams.get('trangthai')
    return status && status in ORDER_STATUS_LABEL ? (status as OrderStatus) : 'all'
  })
  const [staleOnly, setStaleOnly] = useState(() => searchParams.get('treo') === '1')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const viewed = useRecentViews('orders')

  const loadOrders = useCallback(() => {
    if (!token) return
    apiFetch<StaffOrderSummary[]>('/orders', {}, token)
      .then((data) => { setOrders(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đơn hàng'))
  }, [token])

  useEffect(loadOrders, [loadOrders])

  const counts = useMemo(() => {
    const result: Partial<Record<OrderStatus, number>> = {}
    for (const order of orders ?? []) result[order.status] = (result[order.status] ?? 0) + 1
    return result
  }, [orders])

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase('vi')
    return (orders ?? []).filter((o) => {
      const matchStatus = (statusFilter === 'all' || o.status === statusFilter) && (!staleOnly || isStaleOrder(o))
      const haystack = [orderCode(o.id), o.id, o.customer?.fullName, o.customer?.email, o.customer?.phone,
        o.customer?.recipientName, o.customer?.recipientPhone].filter(Boolean).join(' ').toLocaleLowerCase('vi')
      return matchStatus && (!term || haystack.includes(term))
    })
  }, [orders, statusFilter, staleOnly, searchQuery])

  const staleCount = useMemo(() => (orders ?? []).filter((o) => isStaleOrder(o)).length, [orders])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const panelOpen = !!selectedId
  const selectedIndex = selectedId ? filtered.findIndex((o) => o.id === selectedId) : -1

  // Opening the first order adds a history entry; moving between orders replaces it, so Back closes the panel.
  const openOrder = useCallback((orderId: string) => {
    navigate(`/admin/don-hang/${orderId}`, { replace: panelOpen })
  }, [navigate, panelOpen])
  const closePanel = useCallback(() => navigate('/admin/don-hang'), [navigate])

  // "Đã xem gần đây": ghi lại đơn vừa mở.
  const viewedPush = viewed.push
  useEffect(() => {
    const order = selectedId ? orders?.find((o) => o.id === selectedId) : undefined
    if (order) viewedPush(order.id, `#${orderCode(order.id)} · ${order.customer?.fullName ?? 'Khách'}`)
  }, [selectedId, orders, viewedPush])

  // Keep the open order on the visible page and in view (e.g. after ↑/↓ crosses a page boundary).
  useEffect(() => {
    if (selectedIndex < 0) return
    const wanted = Math.floor(selectedIndex / PAGE_SIZE) + 1
    if (wanted !== page) setCurrentPage(wanted)
    rowRefs.current.get(selectedId!)?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, selectedId, page])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if (typing || document.querySelector('[role="dialog"]')) return // never steal keys from a form or a dialog
      if (event.key === 'Escape') { event.preventDefault(); closePanel() }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && selectedIndex >= 0) {
        const next = filtered[selectedIndex + (event.key === 'ArrowDown' ? 1 : -1)]
        if (next) { event.preventDefault(); openOrder(next.id) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, selectedIndex, filtered, openOrder, closePanel])

  // Compact list while the panel is open: only what you need to pick the next order.
  const col = (always: boolean) => (always || !panelOpen ? '' : 'hidden')

  return (
    <div className={panelOpen ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(460px,42%)] xl:gap-space-lg xl:items-start' : ''}>
      <div className="min-w-0">
        <div className={a.toolbar}>
          <h1 className="!mb-0">Đơn hàng ({filtered.length})</h1>
          <SearchBox page="orders" placeholder="Tìm mã đơn, tên, email, SĐT..." value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }} />
        </div>

        <div className={`${a.filterBar} mb-space-md`}>
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} type="button" className={chipClass(statusFilter === f.value)}
              onClick={() => { setStatusFilter(f.value); setCurrentPage(1) }}>
              {f.label}{f.value !== 'all' && counts[f.value] ? ` (${counts[f.value]})` : ''}
            </button>
          ))}
          {(staleCount > 0 || staleOnly) && (
            <button type="button" className={chipClass(staleOnly)} aria-pressed={staleOnly}
              onClick={() => { setStaleOnly(!staleOnly); setCurrentPage(1) }}>
              Đơn treo ({staleCount})
            </button>
          )}
        </div>

        <RecentViews items={viewed.items} onOpen={openOrder} onClear={viewed.clear} />
        {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

        <div className={a.tableWrap}>
          <table className={`${a.table} ${panelOpen ? '!min-w-0' : ''}`}>
            <thead>
              <tr>
                <th>Mã đơn</th><th>Khách hàng</th><th className={col(false)}>Sản phẩm</th><th>Tổng tiền</th>
                <th className={col(false)}>Thanh toán</th><th className={col(false)}>Ngày đặt</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {!orders && !error && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Đang tải đơn hàng…</td></tr>}
              {orders && visible.length === 0 && (
                <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Không tìm thấy đơn hàng nào.</td></tr>
              )}
              {visible.map((o) => {
                const selected = o.id === selectedId
                return (
                  <tr key={o.id} ref={(el) => { if (el) rowRefs.current.set(o.id, el); else rowRefs.current.delete(o.id) }}
                    aria-selected={selected}
                    className={`cursor-pointer hover:bg-surface-container-low ${selected ? 'is-selected' : ''}`}
                    onClick={() => openOrder(o.id)}>
                    <td><button type="button" className={a.linkButton} onClick={(e) => { e.stopPropagation(); openOrder(o.id) }}>{orderCode(o.id)}</button></td>
                    <td>
                      <div className="font-semibold">{o.customer?.fullName ?? o.customer?.recipientName ?? '—'}</div>
                      <div className="font-label-md text-label-md text-on-surface-variant">
                        {panelOpen ? dateTime.format(new Date(o.createdAt)) : (o.customer?.email ?? o.customer?.recipientPhone ?? '')}
                      </div>
                    </td>
                    <td className={col(false)}>{o.itemCount}</td>
                    <td className="whitespace-nowrap">
                      {formatVnd(o.totalAmount)}
                      {o.refundedAmount > 0 && <div className="font-label-sm text-label-sm text-error">Đã hoàn {formatVnd(o.refundedAmount)}</div>}
                      {panelOpen && awaitsTransfer(o) && <div className="font-label-sm text-label-sm text-on-surface-variant">CK · chờ tiền</div>}
                    </td>
                    <td className={`whitespace-nowrap ${col(false)}`}>
                      {awaitsTransfer(o)
                        ? <span className={statusPillClass('locked')}>CK · Chờ đối chiếu tiền</span>
                        : <span className="font-body-md text-body-md text-on-surface-variant">{paymentShort(o)}</span>}
                    </td>
                    <td className={`whitespace-nowrap ${col(false)}`}>{dateTime.format(new Date(o.createdAt))}</td>
                    <td>
                      <span className={statusPillClass(ORDER_STATUS_TONE[o.status])}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                      {isStaleOrder(o) && (
                        <span className="block mt-0.5 font-label-sm text-label-sm text-[#EA580C] whitespace-nowrap">Treo {orderAgeDays(o)} ngày</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-space-lg flex-wrap">
            <button className={pageButtonClass(false)} disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>&lt;</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={pageButtonClass(page === p)} onClick={() => setCurrentPage(p)}>{p}</button>
            ))}
            <button className={pageButtonClass(false)} disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>&gt;</button>
          </div>
        )}
      </div>

      {panelOpen && (
        <>
          {/* Narrow screens: the panel slides over the list, with a backdrop that closes it. */}
          <div className="xl:hidden fixed inset-0 z-30 bg-black/40" aria-hidden="true" onClick={closePanel} />
          <aside aria-label={`Chi tiết đơn ${orderCode(selectedId!)}`}
            className="fixed inset-y-0 right-0 z-40 w-full sm:w-[560px] overflow-y-auto bg-surface-container-lowest shadow-2xl
                       xl:sticky xl:top-24 xl:bottom-auto xl:right-auto xl:z-auto xl:w-auto xl:max-h-[calc(100vh-7rem)] xl:rounded-xl xl:shadow-sm xl:ring-1 xl:ring-line">
            <OrderDetailPanel
              key={selectedId}
              orderId={selectedId!}
              onClose={closePanel}
              onChanged={loadOrders}
              position={selectedIndex >= 0 ? `${selectedIndex + 1} / ${filtered.length}` : undefined}
            />
          </aside>
        </>
      )}
    </div>
  )
}
