import { useEffect, useMemo, useState } from 'react'
import { age, type Customer, type CustomerStatus } from '../types/customer'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { apiFetch, ApiError } from '../../lib/api'
import { a, chipClass, statusPillClass } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { useDialog } from '../../state/DialogContext'

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: 'Hoạt động',
  locked: 'Đã khoá',
  deleted: 'Đã xoá mềm',
}

const STATUS_FILTERS: { value: CustomerStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khoá' },
  { value: 'deleted', label: 'Đã xoá mềm' },
]

type SortKey = 'fullName' | 'age' | 'totalOrders' | 'ltv'

function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(id)
  }, [message])
  return { message, show: setMessage }
}

export default function AdminCustomersPage() {
  const { token } = useAuth()
  const { confirm } = useDialog()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('fullName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toast = useToast()

  const refresh = () => {
    if (!token) return
    apiFetch<Customer[]>('/customers', {}, token)
      .then((data) => {
        setCustomers(data)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách khách hàng'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = customers.filter(
      (c) =>
        (statusFilter === 'all' || c.status === statusFilter) &&
        (!q || (c.fullName ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)),
    )
    list = [...list].sort((a, b) => {
      const va = sortKey === 'fullName' ? (a.fullName ?? '') : sortKey === 'age' ? (age(a.dob) ?? -1) : sortKey === 'totalOrders' ? a.totalOrders : a.ltv
      const vb = sortKey === 'fullName' ? (b.fullName ?? '') : sortKey === 'age' ? (age(b.dob) ?? -1) : sortKey === 'totalOrders' ? b.totalOrders : b.ltv
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [customers, query, statusFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const setStatus = async (id: string, status: CustomerStatus) => {
    try {
      await apiFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token)
      refresh()
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Cập nhật trạng thái thất bại')
    }
  }

  const toggleLock = (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    const next: CustomerStatus = c.status === 'locked' ? 'active' : 'locked'
    setStatus(id, next)
    toast.show(next === 'locked' ? `Đã khoá "${c.fullName}"` : `Đã mở khoá "${c.fullName}"`)
  }

  const softDelete = async (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    if (!(await confirm({ title: 'Xoá mềm khách hàng', message: <>Xoá mềm <strong>{c.fullName}</strong>? Tài khoản bị ẩn khỏi hệ thống nhưng dữ liệu và lịch sử đơn hàng vẫn được giữ nguyên.</>, confirmLabel: 'Xoá mềm', tone: 'danger' }))) return
    setStatus(id, 'deleted')
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast.show(`Đã xoá mềm "${c.fullName}"`)
  }

  const bulkLock = async () => {
    await Promise.all([...selected].map((id) => apiFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'locked' }) }, token)))
    toast.show(`Đã khoá ${selected.size} khách hàng`)
    setSelected(new Set())
    refresh()
  }

  const bulkSoftDelete = async () => {
    if (!(await confirm({ title: 'Xoá mềm nhiều khách hàng', message: <>Xoá mềm <strong>{selected.size}</strong> khách hàng đã chọn? Dữ liệu và lịch sử đơn hàng vẫn được giữ nguyên.</>, confirmLabel: 'Xoá mềm', tone: 'danger' }))) return
    await Promise.all([...selected].map((id) => apiFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'deleted' }) }, token)))
    toast.show(`Đã xoá mềm ${selected.size} khách hàng`)
    setSelected(new Set())
    refresh()
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((c) => c.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Khách hàng ({filtered.length}/{customers.length})</h1>
      </div>

      {loadError && <p className="font-body-md text-body-md text-error mb-space-md">{loadError}</p>}

      <div className={a.toolbar}>
        <input
          className={`${a.input} max-w-[280px]`}
          type="search"
          placeholder="Tìm theo tên hoặc email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={a.filterBar}>
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
      </div>

      {selected.size > 0 && (
        <div className={a.bulkBar}>
          <span>{selected.size} đã chọn</span>
          <button className={buttonClass('outline', 'sm')} type="button" onClick={bulkLock}>Khoá đã chọn</button>
          <button className={buttonClass('outline', 'sm')} type="button" onClick={bulkSoftDelete}>Xoá mềm đã chọn</button>
          <button className={buttonClass('outline', 'sm')} type="button" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div>
      )}

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className={a.sortable} onClick={() => toggleSort('fullName')}>Họ tên{sortArrow('fullName')}</th>
              <th>Email / SĐT</th>
              <th className={a.sortable} onClick={() => toggleSort('age')}>Tuổi{sortArrow('age')}</th>
              <th className={a.sortable} onClick={() => toggleSort('totalOrders')}>Đơn hàng{sortArrow('totalOrders')}</th>
              <th className={a.sortable} onClick={() => toggleSort('ltv')}>LTV{sortArrow('ltv')}</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className={a.empty}>
                    <p>{customers.length === 0 ? 'Chưa có khách hàng nào đăng ký.' : 'Không có khách hàng nào khớp bộ lọc hiện tại.'}</p>
                    {customers.length > 0 && (
                      <button className={buttonClass('outline', 'sm')} type="button" onClick={clearFilters}>Xoá bộ lọc</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? 'is-selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${c.fullName}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelectOne(c.id)}
                    />
                  </td>
                  <td>{c.fullName ?? '—'}</td>
                  <td>
                    {c.email ?? '—'}
                    <br />
                    <span className="text-on-surface-variant">{c.phone ?? '—'}</span>
                  </td>
                  <td>{age(c.dob) ?? '—'}</td>
                  <td>{c.totalOrders}</td>
                  <td>{formatVnd(c.ltv)}</td>
                  <td>
                    <span className={statusPillClass(c.status)}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <button
                      className={buttonClass('outline', 'sm', 'mr-1.5')}
                      type="button"
                      disabled={c.status === 'deleted'}
                      onClick={() => toggleLock(c.id)}
                    >
                      {c.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                    </button>
                    <button
                      className={buttonClass('outline', 'sm')}
                      type="button"
                      disabled={c.status === 'deleted'}
                      onClick={() => softDelete(c.id)}
                    >
                      Xoá mềm
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        Dữ liệu thật từ bảng <code>users</code> (role=buyer). "Đơn hàng"/"LTV" sẽ luôn hiển thị 0 cho tới khi module Order được xây dựng.
        Khách hàng tự đăng ký qua app — admin không tạo tài khoản khách hàng trực tiếp.
      </p>

      {toast.message && <div className={a.toast} role="status">{toast.message}</div>}
    </div>
  )
}
