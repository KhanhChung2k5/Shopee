import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { fetchCategories, type CatalogCategory } from '../../../lib/catalog'
import { AGE_BUCKETS, AGE_LABEL, RFM_LABEL, createSegment, deleteSegment, describeRule, fetchSegments, refreshSegment, timeVi, type Segment } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../state/DialogContext'
import { RecentViews, SearchBox, StatusFilter } from '../../components/ListSearch'
import { matches, useRecentViews } from '../../components/listSearchState'

const RFM_KEYS = ['champions', 'loyal', 'potential', 'at_risk', 'lost'] as const

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/**
 * Phân khúc khách hàng (p5-02/p5-10). Kinh doanh tạo/sửa; CSKH chỉ xem để chọn khi gửi khảo sát.
 * Một phân khúc kết hợp tuỳ ý 3 preset: nhóm tuổi, RFM, loại sản phẩm đã mua (mỗi preset chọn được nhiều giá trị).
 */
export default function AdminSegmentsPage() {
  const { token, user } = useAuth()
  const { confirm } = useDialog()
  const canEdit = user?.department === 'sales'
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [ages, setAges] = useState<string[]>([])
  const [rfms, setRfms] = useState<string[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'default' | 'custom'>('all')
  const viewed = useRecentViews('segments')
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
    const presets = [ages.length && 'age', rfms.length && 'rfm', categoryIds.length && 'category'].filter(Boolean) as string[]
    if (!name.trim() || presets.length === 0) {
      setError('Nhập tên và chọn ít nhất một tiêu chí (nhóm tuổi, RFM hoặc loại sản phẩm).')
      return
    }
    const picked = categories.filter((c) => categoryIds.includes(c.id))
    const rule: Record<string, unknown> = { presets }
    if (ages.length) rule.buckets = ages
    if (rfms.length) rule.segments = rfms
    // Khách thuộc phân khúc nếu đã mua ít nhất một trong các loại đã chọn.
    if (picked.length) rule.categoryNames = picked.map((c) => c.name)
    setSaving(true)
    try {
      await createSegment(token, name.trim(), rule)
      setName(''); setAges([]); setRfms([]); setCategoryIds([]); setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được phân khúc')
    } finally {
      setSaving(false)
    }
  }

  const shown = useMemo(() => segments?.filter((s) => (kind === 'all' || (kind === 'default') === s.locked)
    && matches(query, s.name, describeRule(s.ruleDefinition), ...s.members.map((m) => m.fullName))) ?? null, [segments, kind, query])

  const toggleMembers = (s: Segment) => {
    if (expanded === s.id) { setExpanded(null); return }
    setExpanded(s.id)
    viewed.push(s.id, s.name)
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
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <StatusFilter options={[['all', 'Tất cả'], ['default', 'Mặc định (RFM)'], ['custom', 'Tự tạo']] as const} value={kind} onChange={setKind}
          counts={{ all: segments?.length ?? 0, default: segments?.filter((s) => s.locked).length ?? 0, custom: segments?.filter((s) => !s.locked).length ?? 0 }} />
        <SearchBox page="segments" placeholder="Tìm tên phân khúc, tiêu chí, khách..." value={query} onChange={setQuery} className="mb-space-md" />
      </div>
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => setExpanded(id)} />

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
          <fieldset className="md:col-span-2 space-y-space-xs">
            <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Loại sản phẩm đã mua <span className="font-normal">(chọn nhiều — khách mua ít nhất một loại)</span></legend>
            <div className="flex flex-wrap gap-space-xs">
              {categories.filter((c) => c.parentId === null).map((c) => (
                <button key={c.id} type="button" className={buttonClass(categoryIds.includes(c.id) ? 'primary' : 'outline', 'sm')} onClick={() => setCategoryIds((v) => toggle(v, c.id))}>{c.name}</button>
              ))}
            </div>
          </fieldset>
          <p className="md:col-span-2 font-label-md text-label-md text-on-surface-variant">
            Có thể chọn một, hai hoặc cả ba preset; khách phải thoả <strong>tất cả</strong> preset đã chọn.
          </p>
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
            {shown?.length === 0 && <tr><td colSpan={5} className="text-center !py-space-xl text-on-surface-variant">{segments?.length ? 'Không có phân khúc nào khớp bộ lọc.' : 'Chưa có phân khúc nào.'}</td></tr>}
            {shown?.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="font-semibold">{s.name} {s.locked && <Badge>Mặc định</Badge>}</td>
                  <td className="text-on-surface-variant">{describeRule(s.ruleDefinition)}</td>
                  <td>
                    <button type="button" className={a.linkButton} onClick={() => toggleMembers(s)}>{s.memberCount} khách</button>
                  </td>
                  <td>{timeVi(s.createdAt)}</td>
                  <td>
                    {canEdit && <div className={a.rowActions}>
                      <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void act(() => refreshSegment(token!, s.id), 'Không làm mới được')}>Làm mới</button>
                      {!s.locked && <button type="button" className={buttonClass('outline', 'sm')} onClick={async () => { if (await confirm({ title: 'Xoá phân khúc', message: <>Xoá phân khúc <strong>{s.name}</strong>?</>, confirmLabel: 'Xoá', tone: 'danger' })) void act(() => deleteSegment(token!, s.id), 'Không xoá được') }}>Xoá</button>}
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
