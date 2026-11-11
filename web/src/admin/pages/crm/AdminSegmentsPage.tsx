import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { fetchCategories, type CatalogCategory } from '../../../lib/catalog'
import { AGE_BUCKETS, AGE_LABEL, RFM_LABEL, createSegment, deleteSegment, describeRule, describeRuleParts, fetchSegments, refreshSegment, timeVi, updateSegment, type Segment } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../state/DialogContext'
import { RecentViews, SearchBox, StatusFilter } from '../../components/ListSearch'
import { matches, useRecentViews } from '../../components/listSearchState'

const RFM_KEYS = ['champions', 'loyal', 'potential', 'at_risk', 'lost'] as const
/** Nhãn RFM từ giá trị cao xuống thấp. `other` đứng cuối vì không rơi vào năm nhóm. */
const RFM_RANK = ['champions', 'loyal', 'potential', 'at_risk', 'lost', 'other', 'new']

function rfmRank(segment: Segment) {
  const rule = segment.ruleDefinition
  const raw = Array.isArray(rule.segments) ? rule.segments[0] : rule.segment ?? rule.rfmSegment
  const index = RFM_RANK.indexOf(typeof raw === 'string' ? raw : '')
  return index === -1 ? RFM_RANK.length : index
}

const PRESETS = [
  { id: 'age', label: 'Độ tuổi' },
  { id: 'rfm', label: 'RFM' },
  { id: 'category', label: 'Danh mục sản phẩm' },
] as const

type PresetId = (typeof PRESETS)[number]['id']

function MultiSelect({ label, options, value, onChange, placeholder }: {
  label: string
  options: { id: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const allSelected = options.length > 0 && options.every((option) => value.includes(option.id))

  const placeMenu = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuBox({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) return
    placeMenu()
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open, placeMenu])

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = value.length > 0 && !allSelected
  }, [value.length, allSelected])

  const summary = value.length === 0
    ? placeholder
    : allSelected
      ? 'Tất cả'
      : options.filter((option) => value.includes(option.id)).map((option) => option.label).join(', ')

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <span className="mb-1 block font-label-md text-label-md text-on-surface-variant">{label}</span>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-space-sm rounded-lg border border-line bg-surface-container-lowest px-space-sm py-2 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cx('truncate font-body-md text-body-md', value.length === 0 ? 'text-on-surface-variant' : 'text-on-surface')}>{summary}</span>
        <span className="material-symbols-outlined shrink-0 text-base text-on-surface-variant">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && menuBox && (
        <div
          ref={menuRef}
          className="fixed z-[60] max-h-72 overflow-y-auto rounded-xl border border-line bg-surface-container-lowest p-1 shadow-lg"
          style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
        >
          <label className="!flex-row !items-center !gap-2 cursor-pointer rounded-lg px-2 py-1.5 font-title-md text-title-md !text-on-surface hover:bg-surface-container">
            <input
              ref={allRef}
              type="checkbox"
              checked={allSelected}
              disabled={options.length === 0}
              onChange={() => onChange(allSelected ? [] : options.map((option) => option.id))}
            />
            Chọn tất cả
          </label>
          {options.length === 0 && <p className="px-2 py-2 font-body-md text-body-md text-on-surface-variant">Chưa có lựa chọn</p>}
          {options.map((option) => (
            <label key={option.id} className="!flex-row !items-center !gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-container">
              <input
                type="checkbox"
                checked={value.includes(option.id)}
                onChange={() => onChange(value.includes(option.id) ? value.filter((id) => id !== option.id) : [...value, option.id])}
              />
              <span className="truncate font-body-md text-body-md !text-on-surface">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const MEMBER_STATUS: Record<string, string> = { active: 'Hoạt động', locked: 'Đã khoá', deleted: 'Đã xoá' }

function textList(rule: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = rule[key]
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    if (typeof value === 'string' && value) return [value]
  }
  return []
}

function knownPresets(rule: Record<string, unknown>): PresetId[] {
  const ids = new Set(textList(rule, ['presets', 'preset']))
  return PRESETS.map((preset) => preset.id).filter((id) => ids.has(id))
}

function ruleError(name: string, presets: PresetId[], ages: string[], rfms: string[], categoryIds: string[]) {
  if (!name.trim() || presets.length === 0) return 'Nhập tên và chọn ít nhất một tiêu chí (độ tuổi, RFM hoặc danh mục sản phẩm).'
  if (presets.includes('age') && ages.length === 0) return 'Chọn ít nhất một độ tuổi, hoặc bỏ tiêu chí này.'
  if (presets.includes('rfm') && rfms.length === 0) return 'Chọn ít nhất một nhóm RFM, hoặc bỏ tiêu chí này.'
  if (presets.includes('category') && categoryIds.length === 0) return 'Chọn ít nhất một danh mục sản phẩm, hoặc bỏ tiêu chí này.'
  return ''
}

function buildRule(presets: PresetId[], ages: string[], rfms: string[], categoryNames: string[]) {
  const rule: Record<string, unknown> = { presets }
  if (ages.length) rule.buckets = ages
  if (rfms.length) rule.segments = rfms
  if (categoryNames.length) rule.categoryNames = categoryNames
  return rule
}

function SegmentCriteriaFields({ presets, ages, rfms, categoryIds, categories, columns, onPresets, onAges, onRfms, onCategories }: {
  presets: PresetId[]
  ages: string[]
  rfms: string[]
  categoryIds: string[]
  categories: CatalogCategory[]
  columns: 1 | 2
  onPresets: (next: string[]) => void
  onAges: (next: string[]) => void
  onRfms: (next: string[]) => void
  onCategories: (next: string[]) => void
}) {
  return (
    <div className="space-y-3.5">
      <MultiSelect
        label="Tiêu chí"
        placeholder="Chọn độ tuổi, RFM, danh mục sản phẩm"
        options={PRESETS.map((preset) => ({ id: preset.id, label: preset.label }))}
        value={presets}
        onChange={onPresets}
      />
      {presets.length > 0 && (
        <div className={columns === 2 ? 'grid grid-cols-1 gap-3.5 md:grid-cols-2' : 'grid grid-cols-1 gap-3.5'}>
          {presets.includes('age') && (
            <MultiSelect label="Độ tuổi" placeholder="Chọn độ tuổi" options={AGE_BUCKETS.map((bucket) => ({ id: bucket, label: AGE_LABEL[bucket] }))} value={ages} onChange={onAges} />
          )}
          {presets.includes('rfm') && (
            <MultiSelect label="RFM" placeholder="Chọn nhóm RFM" options={RFM_KEYS.map((key) => ({ id: key, label: RFM_LABEL[key] }))} value={rfms} onChange={onRfms} />
          )}
          {presets.includes('category') && (
            <MultiSelect
              label="Danh mục sản phẩm"
              placeholder="Chọn danh mục đã mua"
              options={categories.filter((category) => category.parentId === null).map((category) => ({ id: category.id, label: category.name }))}
              value={categoryIds}
              onChange={onCategories}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SegmentDetailPanel({ segment, categories, canEdit, token, onClose, onSaved, onDeleted }: {
  segment: Segment
  categories: CatalogCategory[]
  canEdit: boolean
  token: string
  onClose: () => void
  onSaved: (segment: Segment) => void
  onDeleted: () => void
}) {
  const { confirm } = useDialog()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(segment.name)
  const [presets, setPresets] = useState<PresetId[]>([])
  const [ages, setAges] = useState<string[]>([])
  const [rfms, setRfms] = useState<string[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditing(false)
    setError('')
  }, [segment.id])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const choosePresets = (next: string[]) => {
    const picked = PRESETS.map((preset) => preset.id).filter((id) => next.includes(id))
    setPresets(picked)
    if (!picked.includes('age')) setAges([])
    if (!picked.includes('rfm')) setRfms([])
    if (!picked.includes('category')) setCategoryIds([])
  }

  const startEdit = () => {
    const rule = segment.ruleDefinition
    const names = new Set(textList(rule, ['categoryNames', 'categoryName']).map((item) => item.toLowerCase()))
    setName(segment.name)
    setPresets(knownPresets(rule))
    setAges(textList(rule, ['buckets', 'bucket']).filter((bucket) => (AGE_BUCKETS as readonly string[]).includes(bucket)))
    setRfms(textList(rule, ['segments', 'segment', 'rfmSegment']).filter((key) => (RFM_KEYS as readonly string[]).includes(key)))
    setCategoryIds(categories.filter((category) => category.parentId === null && names.has(category.name.toLowerCase())).map((category) => category.id))
    setError('')
    setEditing(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const message = ruleError(name, presets, ages, rfms, categoryIds)
    if (message) { setError(message); return }
    const categoryNames = categories.filter((category) => categoryIds.includes(category.id)).map((category) => category.name)
    setSaving(true)
    try {
      const updated = await updateSegment(token, segment.id, name.trim(), buildRule(presets, ages, rfms, categoryNames))
      onSaved(updated)
      setEditing(false)
      setError('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không sửa được phân khúc')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const accepted = await confirm({ title: 'Xoá phân khúc', message: <>Xoá phân khúc <strong>{segment.name}</strong>?</>, confirmLabel: 'Xoá', tone: 'danger' })
    if (!accepted) return
    try {
      await deleteSegment(token, segment.id)
      onDeleted()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không xoá được')
    }
  }

  const mutable = canEdit && !segment.locked
  const actionHint = !canEdit ? 'Chỉ bộ phận Kinh doanh và CSKH được sửa hoặc xoá' : segment.locked ? 'Phân khúc mặc định không sửa hoặc xoá được' : undefined

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="segment-detail-title" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-space-sm border-b border-line px-space-lg py-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            <button type="button" className={buttonClass(editing ? 'primary' : 'outline', 'sm')} disabled={!mutable} title={actionHint} onClick={() => (editing ? setEditing(false) : startEdit())}>
              <span className="material-symbols-outlined text-base">{editing ? 'close' : 'edit'}</span>
              {editing ? 'Huỷ sửa' : 'Sửa'}
            </button>
            <button type="button" className={buttonClass('danger', 'sm')} disabled={!mutable} title={actionHint} onClick={() => void remove()}>
              <span className="material-symbols-outlined text-base">delete</span>
              Xoá
            </button>
          </div>
          <button ref={closeRef} type="button" aria-label="Đóng" onClick={onClose} className="material-symbols-outlined rounded-lg p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer">close</button>
        </div>
        <div className="flex-1 space-y-space-md overflow-y-auto p-space-lg">
          <div>
            <h2 id="segment-detail-title" className="font-headline-md text-headline-md text-on-surface">{segment.name}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{segment.locked ? 'Mặc định' : 'Tự tạo'} · {segment.memberCount} khách · {timeVi(segment.createdAt)}</p>
          </div>
          {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
          {editing ? (
            <form className="space-y-3.5" onSubmit={(event) => void save(event)}>
              <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
                Tên phân khúc
                <input className="rounded-lg border border-line bg-surface-container-lowest px-space-sm py-2 font-body-md text-body-md text-on-surface" required value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <SegmentCriteriaFields presets={presets} ages={ages} rfms={rfms} categoryIds={categoryIds} categories={categories} columns={1} onPresets={choosePresets} onAges={setAges} onRfms={setRfms} onCategories={setCategoryIds} />
              <p className="font-label-md text-label-md text-on-surface-variant">Trong mỗi tiêu chí, khách thuộc ít nhất một giá trị đã chọn và phải thoả tất cả tiêu chí.</p>
              <div className="flex justify-end">
                <button type="submit" className={buttonClass('primary')} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
              </div>
            </form>
          ) : (
            <>
              <section className={a.card}>
                <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">Tiêu chí</h3>
                <ul className="space-y-1 font-body-md text-body-md text-on-surface">
                  {describeRuleParts(segment.ruleDefinition).map((part) => <li key={part}>{part}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">Thành viên ({segment.memberCount})</h3>
                {segment.members.length === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Chưa có khách nào.</p> : (
                  <ul className="divide-y divide-line rounded-xl bg-surface-container-lowest">
                    {segment.members.map((member) => (
                      <li key={member.userId} className="flex items-center justify-between gap-space-sm px-space-md py-2">
                        <span className="min-w-0">
                          <span className="block truncate font-title-md text-title-md text-on-surface">{member.fullName ?? member.userId.slice(0, 8)}</span>
                          <span className="font-label-md text-label-md text-on-surface-variant">Thêm lúc {timeVi(member.addedAt)}</span>
                        </span>
                        <Badge tone={member.status === 'active' ? 'info' : 'neutral'}>{MEMBER_STATUS[member.status] ?? member.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

/**
 * Phân khúc khách hàng (p5-02/p5-10). Bán hàng và CSKH cùng tạo/sửa để chọn đối tượng gửi khảo sát và chiến dịch.
 * Một phân khúc kết hợp tuỳ ý 3 preset: nhóm tuổi, RFM, loại sản phẩm đã mua (mỗi preset chọn được nhiều giá trị).
 */
export default function AdminSegmentsPage() {
  const { token, user } = useAuth()
  const canEdit = user?.department === 'sales' || user?.department === 'cs'
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [presets, setPresets] = useState<PresetId[]>([])
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

  const resetForm = () => {
    setName('')
    setPresets([])
    setAges([])
    setRfms([])
    setCategoryIds([])
  }

  const choosePresets = (next: string[]) => {
    const picked = PRESETS.map((preset) => preset.id).filter((id) => next.includes(id))
    setPresets(picked)
    if (!picked.includes('age')) setAges([])
    if (!picked.includes('rfm')) setRfms([])
    if (!picked.includes('category')) setCategoryIds([])
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    const message = ruleError(name, presets, ages, rfms, categoryIds)
    if (message) { setError(message); return }
    const categoryNames = categories.filter((category) => categoryIds.includes(category.id)).map((category) => category.name)
    const rule = buildRule(presets, ages, rfms, categoryNames)
    setSaving(true)
    try {
      await createSegment(token, name.trim(), rule)
      resetForm()
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được phân khúc')
    } finally {
      setSaving(false)
    }
  }

  const shown = useMemo(() => {
    const filtered = segments?.filter((s) => (kind === 'all' || (kind === 'default') === s.locked)
      && matches(query, s.name, describeRule(s.ruleDefinition), ...s.members.map((m) => m.fullName)))
    if (!filtered) return null
    return [...filtered].sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1
      if (a.locked && b.locked) return rfmRank(a) - rfmRank(b)
      return 0
    })
  }, [segments, kind, query])

  const selected = segments?.find((segment) => segment.id === selectedId) ?? null

  const openSegment = (segment: Segment) => {
    setSelectedId(segment.id)
    viewed.push(segment.id, segment.name)
  }

  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    try { await fn(); load() } catch (e) { setError(e instanceof ApiError ? e.message : fallback) }
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Phân khúc khách hàng</h1>
        {canEdit && (
          <button type="button" className={buttonClass(showForm ? 'outline' : 'primary')} onClick={() => { if (showForm) resetForm(); setShowForm((open) => !open) }}>
            {showForm ? 'Đóng' : '+ Tạo phân khúc'}
          </button>
        )}
      </div>
      {!canEdit && <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">Bạn đang xem ở chế độ chỉ đọc. Phân khúc do bộ phận Kinh doanh và CSKH quản lý.</p>}
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <StatusFilter options={[['all', 'Tất cả'], ['default', 'Mặc định (RFM)'], ['custom', 'Tự tạo']] as const} value={kind} onChange={setKind}
          counts={{ all: segments?.length ?? 0, default: segments?.filter((s) => s.locked).length ?? 0, custom: segments?.filter((s) => !s.locked).length ?? 0 }} />
        <SearchBox page="segments" placeholder="Tìm tên phân khúc, tiêu chí, khách..." value={query} onChange={setQuery} className="mb-space-md" />
      </div>
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => { const found = segments?.find((segment) => segment.id === id); if (found) openSegment(found) }} />

      {showForm && canEdit && (
        <form className={a.catalogForm} onSubmit={submit}>
          <div className={a.formHeading}><h2>Phân khúc mới</h2></div>
          <label className={a.formWide}>Tên phân khúc<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Game thủ trẻ 18–24 trung thành" /></label>
          <div className={a.formWide}>
            <SegmentCriteriaFields presets={presets} ages={ages} rfms={rfms} categoryIds={categoryIds} categories={categories} columns={2} onPresets={choosePresets} onAges={setAges} onRfms={setRfms} onCategories={setCategoryIds} />
          </div>
          <p className="md:col-span-2 font-label-md text-label-md text-on-surface-variant">
            Chọn một hoặc nhiều tiêu chí. Trong mỗi tiêu chí, khách thuộc ít nhất một giá trị đã chọn và phải thoả <strong>tất cả</strong> tiêu chí.
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
              <tr key={s.id} className={selectedId === s.id ? 'is-selected' : undefined}>
                <td className="font-semibold">
                  <button type="button" className={s.locked ? 'border-0 bg-transparent p-0 text-left font-semibold text-on-surface-variant cursor-pointer' : `${a.linkButton} text-left`} onClick={() => openSegment(s)}>{s.name}</button>
                  {s.locked && <Badge>Mặc định</Badge>}
                </td>
                <td className="text-on-surface-variant">{describeRule(s.ruleDefinition)}</td>
                <td>{s.memberCount} khách</td>
                <td>{timeVi(s.createdAt)}</td>
                <td>
                  {canEdit && <div className={a.rowActions}>
                    <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void act(() => refreshSegment(token!, s.id), 'Không làm mới được')}>Làm mới</button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && token && (
        <SegmentDetailPanel
          key={selected.id}
          segment={selected}
          categories={categories}
          canEdit={canEdit}
          token={token}
          onClose={() => setSelectedId(null)}
          onSaved={(updated) => setSegments((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? current)}
          onDeleted={load}
        />
      )}
    </div>
  )
}
