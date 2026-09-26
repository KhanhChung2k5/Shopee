import { useEffect, useMemo, useState } from 'react'
import { INITIAL_CUSTOMERS, age, type Customer, type CustomerStatus } from '../data/sampleCustomers'
import { formatVnd } from '../../data/sampleProducts'

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
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('fullName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toast = useToast()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = customers.filter(
      (c) =>
        (statusFilter === 'all' || c.status === statusFilter) &&
        (!q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    )
    list = [...list].sort((a, b) => {
      const va = sortKey === 'fullName' ? a.fullName : sortKey === 'age' ? age(a.dob) : sortKey === 'totalOrders' ? a.totalOrders : a.ltv
      const vb = sortKey === 'fullName' ? b.fullName : sortKey === 'age' ? age(b.dob) : sortKey === 'totalOrders' ? b.totalOrders : b.ltv
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

  const toggleLock = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === 'locked' ? 'active' : 'locked' } : c)),
    )
    const c = customers.find((x) => x.id === id)
    toast.show(c?.status === 'locked' ? `Đã mở khoá "${c.fullName}"` : `Đã khoá "${c?.fullName}"`)
  }

  const softDelete = (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!confirm(`Xoá mềm "${c?.fullName}"? Lịch sử đơn hàng vẫn được giữ nguyên, chỉ ẩn tài khoản.`)) return
    setCustomers((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'deleted' } : x)))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast.show(`Đã xoá mềm "${c?.fullName}"`)
  }

  const bulkLock = () => {
    setCustomers((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, status: 'locked' } : c)))
    toast.show(`Đã khoá ${selected.size} khách hàng`)
    setSelected(new Set())
  }

  const bulkSoftDelete = () => {
    if (!confirm(`Xoá mềm ${selected.size} khách hàng đã chọn?`)) return
    setCustomers((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, status: 'deleted' } : c)))
    toast.show(`Đã xoá mềm ${selected.size} khách hàng`)
    setSelected(new Set())
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

  const addCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) return
    setCustomers((prev) => [
      {
        id: `c-${Date.now()}`,
        fullName: newName.trim(),
        email: newEmail.trim(),
        phone: '-',
        gender: 'Khác',
        dob: '2000-01-01',
        status: 'active',
        favoriteCategory: '-',
        totalOrders: 0,
        ltv: 0,
      },
      ...prev,
    ])
    toast.show(`Đã thêm "${newName.trim()}"`)
    setNewName('')
    setNewEmail('')
    setShowAddForm(false)
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ margin: 0 }}>Khách hàng ({filtered.length}/{customers.length})</h1>
        <button className="button button--primary button--sm" type="button" onClick={() => setShowAddForm((s) => !s)}>
          {showAddForm ? 'Huỷ' : '+ Thêm khách hàng'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addCustomer} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          <input
            className="search__input"
            style={{ position: 'static', maxWidth: 220 }}
            placeholder="Họ tên"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            className="search__input"
            style={{ position: 'static', maxWidth: 260 }}
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button className="button button--outline button--sm" type="submit">Lưu</button>
        </form>
      )}

      <div className="admin-toolbar">
        <input
          className="search__input"
          style={{ position: 'static', maxWidth: 280 }}
          type="search"
          placeholder="Tìm theo tên hoặc email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-bar" style={{ marginBottom: 0 }}>
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
      </div>

      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span>{selected.size} đã chọn</span>
          <button className="button button--outline button--sm" type="button" onClick={bulkLock}>Khoá đã chọn</button>
          <button className="button button--outline button--sm" type="button" onClick={bulkSoftDelete}>Xoá mềm đã chọn</button>
          <button className="button button--outline button--sm" type="button" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="admin-table__sortable" onClick={() => toggleSort('fullName')}>Họ tên{sortArrow('fullName')}</th>
              <th>Email / SĐT</th>
              <th className="admin-table__sortable" onClick={() => toggleSort('age')}>Tuổi{sortArrow('age')}</th>
              <th>Sở thích (ngành hàng)</th>
              <th className="admin-table__sortable" onClick={() => toggleSort('totalOrders')}>Đơn hàng{sortArrow('totalOrders')}</th>
              <th className="admin-table__sortable" onClick={() => toggleSort('ltv')}>LTV{sortArrow('ltv')}</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="admin-empty">
                    <p>Không có khách hàng nào khớp bộ lọc hiện tại.</p>
                    <button className="button button--outline button--sm" type="button" onClick={clearFilters}>Xoá bộ lọc</button>
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
                  <td>{c.fullName}</td>
                  <td>
                    {c.email}
                    <br />
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{c.phone}</span>
                  </td>
                  <td>{age(c.dob)}</td>
                  <td>{c.favoriteCategory}</td>
                  <td>{c.totalOrders}</td>
                  <td>{formatVnd(c.ltv)}</td>
                  <td>
                    <span className={`status-pill status-pill--${c.status}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="button button--outline button--sm"
                      type="button"
                      disabled={c.status === 'deleted'}
                      onClick={() => toggleLock(c.id)}
                      style={{ marginRight: 6 }}
                    >
                      {c.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                    </button>
                    <button
                      className="button button--outline button--sm"
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

      {toast.message && <div className="admin-toast" role="status">{toast.message}</div>}
    </div>
  )
}
