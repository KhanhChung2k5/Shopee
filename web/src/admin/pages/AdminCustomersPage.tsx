import { useEffect, useMemo, useState } from 'react'
import { age, type Customer, type CustomerStatus } from '../types/customer'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { apiFetch, ApiError } from '../../lib/api'
import { a, statusPillClass } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { useDialog } from '../../state/DialogContext'
import CustomerDetailPanel from '../components/CustomerDetailPanel'
import CustomerEditDialog from '../components/CustomerEditDialog'
import { RecentViews, SearchBox, StatusFilter } from '../components/ListSearch'
import { matches, useRecentViews } from '../components/listSearchState'

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: 'Hoạt động',
  locked: 'Đã khoá',
  deleted: 'Đã xoá mềm',
}

const STATUS_FILTERS = [
  ['all', 'Tất cả'],
  ['active', 'Hoạt động'],
  ['locked', 'Đã khoá'],
  ['deleted', 'Đã xoá mềm'],
] as const

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
  const { token, user } = useAuth()
  // Restoring a soft-deleted account is CS-only (enforced by POST /api/customers/{id}/restore).
  const canRestore = user?.department === 'cs'
  const { confirm } = useDialog()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('fullName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const viewed = useRecentViews('customers')
  const openDetail = (c: Customer) => { setDetailId(c.id); viewed.push(c.id, c.fullName ?? c.email ?? 'Khách hàng') }
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
    let list = customers.filter(
      (c) => (statusFilter === 'all' || c.status === statusFilter) && matches(query, c.fullName, c.email, c.phone),
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

  /** Applies a status; returns whether the backend accepted it (it refuses e.g. a customer with an unfinished order). */
  const setStatus = async (id: string, status: CustomerStatus): Promise<boolean> => {
    try {
      await apiFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token)
      refresh()
      return true
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Cập nhật trạng thái thất bại')
      return false
    }
  }

  const toggleLock = async (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    const next: CustomerStatus = c.status === 'locked' ? 'active' : 'locked'
    if (await setStatus(id, next)) toast.show(next === 'locked' ? `Đã khoá "${c.fullName}"` : `Đã mở khoá "${c.fullName}"`)
  }

  const softDelete = async (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    if (!(await confirm({ title: 'Xoá mềm khách hàng', message: <>Xoá mềm <strong>{c.fullName}</strong>? Tài khoản bị ẩn khỏi hệ thống nhưng dữ liệu và lịch sử đơn hàng vẫn được giữ nguyên.</>, confirmLabel: 'Xoá mềm', tone: 'danger' }))) return
    if (!(await setStatus(id, 'deleted'))) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast.show(`Đã xoá mềm "${c.fullName}"`)
  }

  const issueTemporaryPassword = async (c: Customer) => {
    if (!(await confirm({ title: 'Cấp mật khẩu tạm', message: <>Cấp mật khẩu tạm cho <strong>{c.fullName}</strong>? Mật khẩu hiện tại của khách sẽ không dùng được nữa. Chỉ làm sau khi đã xác minh đúng là chủ tài khoản.</>, confirmLabel: 'Cấp mật khẩu', tone: 'danger' }))) return
    try {
      const { temporaryPassword } = await apiFetch<{ temporaryPassword: string }>(`/customers/${c.id}/temporary-password`, { method: 'POST' }, token)
      const copy = await confirm({
        title: 'Mật khẩu tạm',
        message: <>Mật khẩu của <strong>{c.fullName}</strong>: <code className="font-mono font-bold select-all">{temporaryPassword}</code>. Mật khẩu chỉ hiện một lần. Hãy nhắc khách đăng nhập rồi đổi ngay trong trang tài khoản.</>,
        confirmLabel: 'Sao chép và đóng',
        cancelLabel: 'Đóng',
      })
      if (copy) await navigator.clipboard.writeText(temporaryPassword).catch(() => toast.show('Không sao chép được mật khẩu'))
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Không cấp được mật khẩu tạm')
    }
  }

  const restore = async (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return
    if (!(await confirm({ title: 'Khôi phục khách hàng', message: <>Khôi phục <strong>{c.fullName}</strong>? Tài khoản trở lại trạng thái hoạt động và khách hàng đăng nhập được như trước.</>, confirmLabel: 'Khôi phục' }))) return
    try {
      await apiFetch(`/api/customers/${id}/restore`, { method: 'POST' }, token)
      toast.show(`Đã khôi phục "${c.fullName}"`)
      refresh()
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Khôi phục thất bại')
    }
  }

  // Bulk actions skip soft-deleted rows: the backend refuses to change them (only restore brings them back).
  const selectedNotDeleted = () => [...selected].filter((id) => customers.find((c) => c.id === id)?.status !== 'deleted')

  /** Applies one status to many customers; reports how many the backend refused instead of stopping at the first. */
  const bulkStatus = async (ids: string[], status: CustomerStatus, verb: string) => {
    const results = await Promise.allSettled(ids.map((id) => apiFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token)))
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    const done = ids.length - failed.length
    const reason = failed[0]?.reason instanceof ApiError ? ` (${failed[0].reason.message})` : ''
    toast.show(failed.length === 0 ? `Đã ${verb} ${done} khách hàng` : `Đã ${verb} ${done}/${ids.length} khách hàng; ${failed.length} khách không ${verb} được${reason}`)
    setSelected(new Set())
    refresh()
  }

  const bulkLock = async () => {
    await bulkStatus(selectedNotDeleted(), 'locked', 'khoá')
  }

  const bulkSoftDelete = async () => {
    const ids = selectedNotDeleted()
    if (!(await confirm({ title: 'Xoá mềm nhiều khách hàng', message: <>Xoá mềm <strong>{ids.length}</strong> khách hàng đã chọn? Dữ liệu và lịch sử đơn hàng vẫn được giữ nguyên.</>, confirmLabel: 'Xoá mềm', tone: 'danger' }))) return
    await bulkStatus(ids, 'deleted', 'xoá mềm')
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
        <SearchBox page="customers" placeholder="Tìm theo tên, email hoặc SĐT..." value={query} onChange={setQuery} />
      </div>
      <StatusFilter options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter}
        counts={{ all: customers.length, active: customers.filter((c) => c.status === 'active').length, locked: customers.filter((c) => c.status === 'locked').length, deleted: customers.filter((c) => c.status === 'deleted').length }} />
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => { const c = customers.find((x) => x.id === id); if (c) openDetail(c); else setDetailId(id) }} />

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
              <th className={a.sortable} onClick={() => toggleSort('ltv')}>LTV dự báo{sortArrow('ltv')}</th>
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
                    <button className={buttonClass('primary', 'sm', 'mr-1.5')} type="button" onClick={() => openDetail(c)}>
                      Chi tiết
                    </button>
                    {c.status !== 'deleted' && (
                      <button className={buttonClass('outline', 'sm', 'mr-1.5')} type="button" onClick={() => setEditing(c)}>
                        Sửa
                      </button>
                    )}
                    {c.status === 'deleted' ? (
                      canRestore ? (
                        <button className={buttonClass('outline', 'sm')} type="button" onClick={() => restore(c.id)}>
                          Khôi phục
                        </button>
                      ) : (
                        <span className="text-on-surface-variant">Chỉ quản trị viên được khôi phục</span>
                      )
                    ) : (
                      <>
                        <button
                          className={buttonClass('outline', 'sm', 'mr-1.5')}
                          type="button"
                          onClick={() => void toggleLock(c.id)}
                        >
                          {c.status === 'locked' ? 'Mở khoá' : 'Khoá'}
                        </button>
                        {c.status === 'active' && (
                          <button
                            className={buttonClass('outline', 'sm', 'mr-1.5')}
                            type="button"
                            onClick={() => void issueTemporaryPassword(c)}
                          >
                            Cấp mật khẩu tạm
                          </button>
                        )}
                        <button
                          className={buttonClass('outline', 'sm')}
                          type="button"
                          onClick={() => softDelete(c.id)}
                        >
                          Xoá mềm
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        "Đơn hàng" là số đơn đã giao; "LTV dự báo" do CRM tính lại khi đơn được giao hoặc hoàn tiền (xem trang Hồ sơ & RFM).
        Không khóa hoặc xóa được khách còn đơn chưa hoàn tất hay yêu cầu hoàn tiền chưa xử lý xong.
        Khách hàng tự đăng ký qua app — admin không tạo tài khoản khách hàng trực tiếp.
      </p>

      {detailId && (
        <CustomerDetailPanel key={`${detailId}-${detailVersion}`} customerId={detailId} onClose={() => setDetailId(null)}
          onEdit={(c) => setEditing(c)} />
      )}
      {editing && (
        <CustomerEditDialog customer={editing} onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); setDetailVersion((v) => v + 1); refresh(); toast.show(message) }} />
      )}
      {toast.message && <div className={a.toast} role="status">{toast.message}</div>}
    </div>
  )
}
