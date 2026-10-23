import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { fetchCategories, type CatalogCategory } from '../../../lib/catalog'
import { AGE_BUCKETS, AGE_LABEL, RFM_LABEL, createSegment, deleteSegment, describeRule, fetchSegments, refreshSegment, timeVi, type Segment } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

const RFM_KEYS = ['champions', 'loyal', 'potential', 'at_risk', 'lost'] as const

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** Phân khúc khách hàng (p5-02/p5-10). Sales + admin tạo/sửa; CS chỉ xem để chọn khi gửi khảo sát. */
export default function AdminSegmentsPage() {
  const { token, user } = useAuth()
  const canEdit = user?.department === 'sales' || user?.department === 'admin'
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [ages, setAges] = useState<string[]>([])
  const [rfms, setRfms] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!token) return
    fetchSegments(token)
      .then((data) => { setSegments(data.segments); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được phân khúc'))
  }, [token])

  useEffect(load, [load])
  useEffect(() => { fetchCategories().then(setCategories).catch(() => setCategories([])) }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    const presets = [ages.length && 'age', rfms.length && 'rfm', categoryId && 'category'].filter(Boolean) as string[]
    if (!name.trim() || presets.length === 0) {
      setError('Nhập tên và chọn ít nhất một tiêu chí (nhóm tuổi, RFM hoặc ngành hàng).')
      return
    }
    const category = categories.find((c) => c.id === categoryId)
    const rule: Record<string, unknown> = { presets }
    if (ages.length) rule.buckets = ages
    if (rfms.length) rule.segments = rfms
    if (category) { rule.categoryId = category.id; rule.categoryNames = [category.name] }
    setSaving(true)
    try {
      await createSegment(token, name.trim(), rule)
      setName(''); setAges([]); setRfms([]); setCategoryId(''); setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được phân khúc')
    } finally {
      setSaving(false)
    }
  }

  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    try { await fn(); load() } catch (e) { setError(e instanceof ApiError ? e.message : fallback) }
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Phân khúc khách hàng</h1>
        {canEdit && <button type="button" className={buttonClass(showForm ? 'outline' : 'primary')} onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng' : '+ Tạo phân khúc'}</button>}
      </div>
      {!canEdit && <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">Bạn đang xem ở chế độ chỉ đọc. Phân khúc do bộ phận Kinh doanh quản lý; CSKH dùng để chọn đối tượng khi gửi khảo sát.</p>}
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      {showForm && canEdit && (
        <form className={a.catalogForm} onSubmit={submit}>
          <div className={a.formHeading}><h2>Phân khúc mới</h2></div>
          <label className={a.formWide}>Tên phân khúc<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Game thủ trẻ 18–24 trung thành" /></label>
          <fieldset className="md:col-span-2 space-y-space-xs">
            <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Nhóm tuổi</legend>
            <div className="flex flex-wrap gap-space-xs">
              {AGE_BUCKETS.map((b) => (
                <button key={b} type="button" className={cx(buttonClass(ages.includes(b) ? 'primary' : 'outline', 'sm'))} onClick={() => setAges((v) => toggle(v, b))}>{AGE_LABEL[b]}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="md:col-span-2 space-y-space-xs">
            <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Phân loại RFM</legend>
            <div className="flex flex-wrap gap-space-xs">
              {RFM_KEYS.map((k) => (
                <button key={k} type="button" className={buttonClass(rfms.includes(k) ? 'primary' : 'outline', 'sm')} onClick={() => setRfms((v) => toggle(v, k))}>{RFM_LABEL[k]}</button>
              ))}
            </div>
          </fieldset>
          <label>Ngành hàng đã mua
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Không lọc —</option>
              {categories.filter((c) => c.parentId === null).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className={a.formActions}>
            <button type="submit" className={buttonClass('primary')} disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo phân khúc'}</button>
          </div>
        </form>
      )}

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Tên</th><th>Tiêu chí</th><th>Thành viên</th><th>Tạo lúc</th><th /></tr></thead>
          <tbody>
            {!segments && <tr><td colSpan={5} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {segments?.length === 0 && <tr><td colSpan={5} className="text-center !py-space-xl text-on-surface-variant">Chưa có phân khúc nào.</td></tr>}
            {segments?.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="font-semibold">{s.name} {s.locked && <Badge>Mặc định</Badge>}</td>
                  <td className="text-on-surface-variant">{describeRule(s.ruleDefinition)}</td>
                  <td>
                    <button type="button" className={a.linkButton} onClick={() => setExpanded(expanded === s.id ? null : s.id)}>{s.memberCount} khách</button>
                  </td>
                  <td>{timeVi(s.createdAt)}</td>
                  <td>
                    {canEdit && <div className={a.rowActions}>
                      <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void act(() => refreshSegment(token!, s.id), 'Không làm mới được')}>Làm mới</button>
                      {!s.locked && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => { if (confirm(`Xoá phân khúc "${s.name}"?`)) void act(() => deleteSegment(token!, s.id), 'Không xoá được') }}>Xoá</button>}
                    </div>}
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr>
                    <td colSpan={5} className="!bg-surface-container-low">
                      {s.members.length === 0 ? 'Chưa có khách nào.' : (
                        <div className="flex flex-wrap gap-space-xs">
                          {s.members.map((m) => <Badge key={m.userId} tone={m.status === 'active' ? 'info' : 'neutral'}>{m.fullName ?? m.userId.slice(0, 8)}</Badge>)}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
