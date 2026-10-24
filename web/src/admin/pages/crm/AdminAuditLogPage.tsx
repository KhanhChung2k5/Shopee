import { useEffect, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass } from '../../../components/ui'
import { ApiError, apiFetch } from '../../../lib/api'
import { timeVi } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

interface LogItem {
  id: string
  actorLogin: string
  actorLabel: string
  department: string
  action: string
  httpMethod: string
  path: string
  statusCode: number
  outcome: 'success' | 'failed'
  occurredAt: string
}

interface LogPage {
  data: LogItem[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

interface Facets {
  actors: { login: string; label: string; department: string }[]
  departments: string[]
  actions: string[]
}

interface Filters {
  q: string
  actor: string
  department: string
  action: string
  outcome: string
}

const EMPTY: Filters = { q: '', actor: '', department: '', action: '', outcome: '' }

const DEPARTMENT_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  cs: 'CSKH',
  sales: 'Kinh doanh',
  warehouse: 'Kho',
  customer: 'Khách hàng',
  crm: 'CRM (cũ)',
}

const deptLabel = (d: string) => DEPARTMENT_LABEL[d] ?? d

/** Nhật ký thao tác (chỉ admin): ai đã làm gì trên các API /api/**, lúc nào, thành công hay bị từ chối. */
export default function AdminAuditLogPage() {
  const { token } = useAuth()
  const [facets, setFacets] = useState<Facets | null>(null)
  const [draft, setDraft] = useState<Filters>(EMPTY)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LogPage | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    apiFetch<Facets>('/api/crm/audit-logs/filters', {}, token).then(setFacets).catch(() => setFacets(null))
  }, [token])

  useEffect(() => {
    if (!token) return
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    setResult(null)
    apiFetch<LogPage>(`/api/crm/audit-logs?${params}`, {}, token)
      .then((data) => { setResult(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được nhật ký'))
  }, [token, filters, page])

  const apply = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setFilters(draft)
  }

  const reset = () => {
    setDraft(EMPTY)
    setFilters(EMPTY)
    setPage(1)
  }

  const set = (key: keyof Filters) => (e: { target: { value: string } }) => setDraft((f) => ({ ...f, [key]: e.target.value }))
  const p = result?.pagination

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Nhật ký thao tác</h1>
        {p && <span className="font-body-md text-body-md text-on-surface-variant">{p.totalItems.toLocaleString('vi-VN')} bản ghi</span>}
      </div>

      <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,1fr)_auto] gap-space-sm items-center mb-space-md" onSubmit={apply}>
        <input className={a.input} placeholder="Tìm theo đường dẫn, thao tác, người…" value={draft.q} onChange={set('q')} />
        <select className={a.input} value={draft.actor} onChange={set('actor')} aria-label="Người thao tác">
          <option value="">Mọi người</option>
          {facets?.actors.map((o) => <option key={o.login} value={o.login}>{o.label} ({o.login})</option>)}
        </select>
        <select className={a.input} value={draft.department} onChange={set('department')} aria-label="Bộ phận">
          <option value="">Mọi bộ phận</option>
          {facets?.departments.map((d) => <option key={d} value={d}>{deptLabel(d)}</option>)}
        </select>
        <select className={a.input} value={draft.action} onChange={set('action')} aria-label="Thao tác">
          <option value="">Mọi thao tác</option>
          {facets?.actions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={a.input} value={draft.outcome} onChange={set('outcome')} aria-label="Kết quả">
          <option value="">Mọi kết quả</option>
          <option value="success">Thành công</option>
          <option value="failed">Thất bại / bị từ chối</option>
        </select>
        <div className="flex gap-space-xs">
          <button type="submit" className={buttonClass('primary', 'sm')}>Lọc</button>
          <button type="button" className={buttonClass('outline', 'sm')} onClick={reset}>Xoá lọc</button>
        </div>
      </form>

      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr><th>Thời gian</th><th>Người thao tác</th><th>Bộ phận</th><th>Thao tác</th><th>Yêu cầu</th><th>Kết quả</th></tr>
          </thead>
          <tbody>
            {!result && !error && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {result?.data.length === 0 && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Không có bản ghi nào khớp bộ lọc.</td></tr>}
            {result?.data.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{timeVi(log.occurredAt)}</td>
                <td>
                  <div className="font-semibold">{log.actorLabel}</div>
                  <div className="text-on-surface-variant font-label-md text-label-md">{log.actorLogin}</div>
                </td>
                <td>{deptLabel(log.department)}</td>
                <td>{log.action}</td>
                <td className="font-mono text-label-md break-all"><strong>{log.httpMethod}</strong> {log.path}</td>
                <td>
                  <Badge className="whitespace-nowrap" tone={log.outcome === 'success' ? 'success' : 'danger'}>{log.outcome === 'success' ? 'Thành công' : 'Thất bại'} · {log.statusCode}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p && p.totalPages > 1 && (
        <div className="flex items-center justify-end gap-space-sm mt-space-md">
          <button type="button" className={buttonClass('outline', 'sm')} disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
          <span className="font-body-md text-body-md">Trang {p.page} / {p.totalPages}</span>
          <button type="button" className={buttonClass('outline', 'sm')} disabled={page >= p.totalPages} onClick={() => setPage(page + 1)}>Sau ›</button>
        </div>
      )}
    </div>
  )
}
