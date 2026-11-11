import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { a } from '../adminUi'
import { Badge, buttonClass, cx } from '../../components/ui'
import { ApiError, apiFetch } from '../../lib/api'
import { fetchCategories, type CatalogCategory } from '../../lib/catalog'
import { timeVi } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'
import { RecentViews, SearchBox, StatusFilter } from '../components/ListSearch'
import { matches, useRecentViews, useViewMode } from '../components/listSearchState'
import { ViewModeToggle } from '../components/ViewModeToggle'

interface StaffReview {
  id: string
  rating: number
  comment: string | null
  replyText: string | null
  createdAt: string
  buyerName: string | null
  productName: string | null
  productId: string | null
  orderId: string
  repliedByName: string | null
  categoryId: string | null
  categoryName: string | null
}

type Filter = 'unreplied' | 'replied' | 'all'
const FILTERS = [['unreplied', 'Chờ phản hồi'], ['replied', 'Đã phản hồi'], ['all', 'Tất cả']] as const
const RECENT_WINDOWS = [7, 15, 30] as const
type RecentWindow = (typeof RECENT_WINDOWS)[number]
const UNCATEGORIZED = 'none'
const DAY_MS = 24 * 60 * 60 * 1000

/** Đánh giá nằm trong N×24 giờ tính tới lúc mở trang. */
function isWithinDays(createdAt: string, days: number) {
  const time = Date.parse(createdAt)
  return Number.isFinite(time) && Date.now() - time <= days * DAY_MS
}

interface IndustryOption {
  id: string
  label: string
  count: number
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#f59e0b] tracking-tight" aria-label={`${rating}/5 sao`}>
      {'★'.repeat(rating)}<span className="text-outline-variant">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/** Ngành hàng gốc của danh mục sản phẩm. Danh mục lá được gom lên danh mục cha cao nhất. */
function industryOf(review: StaffReview, byId: Map<string, CatalogCategory>) {
  if (!review.categoryId) return { id: UNCATEGORIZED, name: 'Chưa phân ngành' }
  let current = byId.get(review.categoryId)
  if (!current) return { id: review.categoryId, name: review.categoryName?.trim() || 'Ngành hàng' }
  const seen = new Set<string>()
  while (current.parentId && byId.has(current.parentId) && !seen.has(current.id)) {
    seen.add(current.id)
    const parent = byId.get(current.parentId)
    if (!parent) break
    current = parent
  }
  return { id: current.id, name: current.name }
}

function IndustryFilter({ options, value, onChange }: {
  options: IndustryOption[]
  /** null = mọi ngành hàng. Mảng = các ngành đang được chọn. */
  value: string[] | null
  onChange: (next: string[] | null) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const allSelected = options.length > 0 && (value === null || options.every((option) => value.includes(option.id)))
  const summary = value === null || allSelected
    ? `Tất cả ngành hàng (${options.length})`
    : value.length === 0
      ? 'Chưa chọn ngành hàng'
      : value.length <= 2
        ? options.filter((option) => value.includes(option.id)).map((option) => option.label).join(', ')
        : `${value.length} ngành hàng`

  const placeMenu = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuBox({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) })
  }, [])

  useEffect(() => {
    if (!open) return
    placeMenu()
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, placeMenu])

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = value !== null && value.length > 0 && !allSelected
  }, [value, allSelected, open])

  const toggle = (id: string) => {
    const current = value === null ? options.map((option) => option.id) : value
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    onChange(next.length === options.length ? null : next)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cx(a.input, '!inline-flex !w-auto max-w-[320px] items-center justify-between gap-2 text-left')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label="Lọc theo ngành hàng"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate" title={summary}>{summary}</span>
        <span className="material-symbols-outlined shrink-0 text-base text-on-surface-variant" aria-hidden="true">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && menuBox && (
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Ngành hàng"
          className="fixed z-[60] max-h-72 overflow-y-auto rounded-xl border border-line bg-surface-container-lowest p-1 shadow-lg"
          style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
        >
          <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-title-md text-title-md !text-on-surface hover:bg-surface-container">
            <input
              ref={allRef}
              type="checkbox"
              checked={allSelected}
              disabled={options.length === 0}
              onChange={() => onChange(allSelected ? [] : null)}
            />
            Chọn tất cả
          </label>
          {options.length === 0 && <p className="px-2 py-2 font-body-md text-body-md text-on-surface-variant">Chưa có ngành hàng</p>}
          {options.map((option) => {
            const checked = value === null || value.includes(option.id)
            return (
              <label key={option.id} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container">
                <input type="checkbox" checked={checked} onChange={() => toggle(option.id)} />
                <span className="truncate font-body-md text-body-md !text-on-surface">{option.label} ({option.count})</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Đánh giá sản phẩm (p4-14): CSKH xem đánh giá của khách, lọc theo sản phẩm / ngành hàng / số sao và phản hồi. */
export default function AdminReviewsPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [reviews, setReviews] = useState<StaffReview[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogCategory[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [star, setStar] = useState(0)
  /** null = mọi ngành hàng. */
  const [industries, setIndustries] = useState<string[] | null>(null)
  /** null = mọi thời điểm. */
  const [recentDays, setRecentDays] = useState<RecentWindow | null>(null)
  const [layout, setLayout] = useViewMode('reviews')
  const viewed = useRecentViews('reviews')

  const load = useCallback(() => {
    if (!token) return
    apiFetch<StaffReview[]>('/reviews/manage', {}, token)
      .then((data) => { setReviews(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đánh giá'))
  }, [token])

  useEffect(load, [load])
  useEffect(() => {
    fetchCategories().then(setCatalog).catch(() => setCatalog([]))
  }, [])

  const categoryById = useMemo(() => new Map(catalog.map((category) => [category.id, category])), [catalog])
  const industryFor = useCallback((review: StaffReview) => industryOf(review, categoryById), [categoryById])

  const inStatus = useCallback((review: StaffReview) =>
    filter === 'all' || (filter === 'unreplied' ? !review.replyText : !!review.replyText), [filter])

  const inWindow = useCallback((review: StaffReview) =>
    recentDays == null || isWithinDays(review.createdAt, recentDays), [recentDays])

  const matchesQuery = useCallback((review: StaffReview) =>
    matches(query, review.productName, review.buyerName, review.comment, review.replyText, review.orderId.slice(0, 8), industryFor(review).name),
  [query, industryFor])

  /**
   * Đánh giá có khớp các bộ lọc đang bật hay không.
   * Các mục trong `skip` được bỏ qua để đếm phương án còn lại (tab trạng thái, sản phẩm, ngành hàng, cửa sổ ngày).
   */
  const passes = useCallback((review: StaffReview, ...skip: Array<'status' | 'product' | 'industry' | 'window'>) => {
    if (!skip.includes('status') && !inStatus(review)) return false
    if (!skip.includes('product') && productId && review.productId !== productId) return false
    if (star && review.rating !== star) return false
    if (!skip.includes('industry') && industries && !industries.includes(industryFor(review).id)) return false
    if (!skip.includes('window') && !inWindow(review)) return false
    return matchesQuery(review)
  }, [inStatus, productId, star, industries, industryFor, inWindow, matchesQuery])

  const periodCounts = useMemo(() => {
    // Bấm mốc ngày sẽ chuyển sang "Tất cả", nên số trên nút không tính tab trạng thái hiện tại.
    const base = (reviews ?? []).filter((review) => passes(review, 'status', 'window'))
    return Object.fromEntries(RECENT_WINDOWS.map((days) => [days, base.filter((review) => isWithinDays(review.createdAt, days)).length])) as Record<RecentWindow, number>
  }, [reviews, passes])

  const chooseRecent = (days: RecentWindow) => {
    if (recentDays === days) {
      setRecentDays(null)
      return
    }
    setRecentDays(days)
    setFilter('all')
  }

  const industryOptions = useMemo(() => {
    const map = new Map<string, IndustryOption>()
    for (const review of reviews ?? []) {
      if (!passes(review, 'industry')) continue
      const industry = industryFor(review)
      const entry = map.get(industry.id) ?? { id: industry.id, label: industry.name, count: 0 }
      entry.count += 1
      map.set(industry.id, entry)
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'))
  }, [reviews, industryFor, passes])

  /** Sản phẩm có đánh giá, kèm số đánh giá đúng với tab và bộ lọc đang chọn. */
  const products = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const review of reviews ?? []) {
      if (!review.productId || !passes(review, 'product')) continue
      const entry = map.get(review.productId) ?? { name: review.productName ?? 'Sản phẩm', count: 0 }
      entry.count += 1
      map.set(review.productId, entry)
    }
    return [...map.entries()].sort((x, y) => x[1].name.localeCompare(y[1].name, 'vi'))
  }, [reviews, passes])

  const counts = useMemo(() => {
    const base = (reviews ?? []).filter((review) => passes(review, 'status'))
    return {
      all: base.length,
      unreplied: base.filter((review) => !review.replyText).length,
      replied: base.filter((review) => review.replyText).length,
    }
  }, [reviews, passes])

  const shown = useMemo(() => reviews?.filter((review) => passes(review)) ?? null, [reviews, passes])

  const chooseIndustries = (next: string[] | null) => {
    setIndustries(next)
    if (next && productId) {
      const stillThere = (reviews ?? []).some((review) => review.productId === productId && next.includes(industryFor(review).id))
      if (!stillThere) setProductId('')
    }
  }

  const clearFilters = () => {
    setProductId('')
    setStar(0)
    setQuery('')
    setIndustries(null)
    setRecentDays(null)
  }

  const startReply = (review: StaffReview) => {
    setEditing(review.id)
    setDraft(review.replyText ?? '')
  }

  const submit = async (id: string) => {
    if (!token || !draft.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/reviews/${id}/reply`, { method: 'PATCH', body: JSON.stringify({ replyText: draft.trim() }) }, token)
      setEditing(null)
      setDraft('')
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không gửi được phản hồi')
    } finally {
      setSaving(false)
    }
  }

  const hasExtraFilter = Boolean(productId || star > 0 || query || industries || recentDays)
  const filteredEmpty = filter === 'unreplied' && !hasExtraFilter
    ? 'Không còn đánh giá nào chờ phản hồi.'
    : 'Không có đánh giá nào khớp bộ lọc.'

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Đánh giá sản phẩm ({shown?.length ?? 0})</h1>
        <SearchBox page="reviews" placeholder="Tìm sản phẩm, khách, nội dung..." value={query} onChange={setQuery} />
      </div>
      <StatusFilter options={FILTERS} value={filter} onChange={setFilter} counts={counts} className="!mb-space-sm" />
      <div className="mb-space-md flex flex-wrap items-center gap-space-sm">
        <div className={a.filterBar}>
          <div role="group" aria-label="Xem nhanh đánh giá gần đây" className="inline-flex rounded-lg bg-surface-container-low p-0.5">
            {RECENT_WINDOWS.map((days) => {
              const active = recentDays === days
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={active}
                  className={cx(
                    'inline-flex items-center gap-1 rounded-md px-space-sm py-1.5 font-label-md text-label-md cursor-pointer whitespace-nowrap transition-colors',
                    active ? 'bg-inverse-surface text-inverse-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                  )}
                  onClick={() => chooseRecent(days)}
                >
                  {days} ngày
                  <span className={active ? 'text-inverse-on-surface/80' : 'text-on-surface-variant'}>({periodCounts[days]})</span>
                </button>
              )
            })}
          </div>
          <select aria-label="Lọc theo sản phẩm" className={cx(a.input, '!w-[260px]')} value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Tất cả sản phẩm ({products.length})</option>
            {products.map(([id, p]) => <option key={id} value={id}>{p.name} ({p.count})</option>)}
          </select>
          <IndustryFilter options={industryOptions} value={industries} onChange={chooseIndustries} />
          <select aria-label="Lọc theo số sao" className={cx(a.input, '!w-auto')} value={star} onChange={(e) => setStar(Number(e.target.value))}>
            <option value={0}>Mọi số sao</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
          </select>
          {hasExtraFilter && <button type="button" className={buttonClass('outline', 'sm')} onClick={clearFilters}>Xoá bộ lọc</button>}
        </div>
      </div>
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => window.open(`/san-pham/${id}`, '_blank', 'noopener')} />
      <div className="mb-space-md flex justify-end">
        <ViewModeToggle value={layout} onChange={setLayout} />
      </div>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      {!reviews && !error && <div className={a.empty}>Đang tải…</div>}
      {shown?.length === 0 && <div className={a.empty}>{filteredEmpty}</div>}

      <div className={layout === 'grid' ? 'grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3' : 'space-y-space-md'}>
        {shown?.map((review) => {
          const industry = industryFor(review)
          return (
            <div key={review.id} className={cx(a.card, layout === 'grid' && 'flex h-full flex-col')}>
              <div className="flex flex-wrap items-start justify-between gap-space-sm">
                <div className="min-w-0">
                  {review.productId ? (
                    <Link to={`/san-pham/${review.productId}`} target="_blank" rel="noopener" title="Mở trang sản phẩm (tab mới)"
                      onClick={() => viewed.push(review.productId!, review.productName ?? 'Sản phẩm')}
                      className="inline-flex items-center gap-1 font-title-md text-title-md text-primary hover:underline">
                      {review.productName ?? 'Sản phẩm'}<span className="material-symbols-outlined !text-base">open_in_new</span>
                    </Link>
                  ) : <div className="font-title-md text-title-md text-on-surface">{review.productName ?? 'Sản phẩm'}</div>}
                  <div className="font-label-md text-label-md text-on-surface-variant">{industry.name}</div>
                  <div className="font-body-md text-body-md text-on-surface-variant">
                    {review.buyerName ?? 'Khách hàng'} · {timeVi(review.createdAt)} · Đơn #{review.orderId.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-space-sm">
                  <Stars rating={review.rating} />
                  {review.replyText ? <Badge tone="success">Đã phản hồi</Badge> : <Badge tone="danger">Chờ phản hồi</Badge>}
                </div>
              </div>

              <p className="mt-space-sm font-body-lg text-body-lg text-on-surface whitespace-pre-line">
                {review.comment?.trim() ? review.comment : <span className="text-on-surface-variant italic">Khách không để lại bình luận.</span>}
              </p>

              {review.replyText && editing !== review.id && (
                <div className="mt-space-sm rounded-lg bg-surface-container-low p-space-sm border-l-4 border-primary">
                  <div className="font-label-md text-label-md text-primary">Phản hồi của shop{review.repliedByName ? ` · ${review.repliedByName}` : ''}</div>
                  <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">{review.replyText}</p>
                </div>
              )}

              {editing === review.id ? (
                <div className="mt-space-sm space-y-space-xs">
                  <textarea className={a.input} rows={3} maxLength={2000} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Cảm ơn bạn đã đánh giá…" />
                  <div className={a.rowActions}>
                    <button type="button" className={buttonClass('primary', 'sm')} disabled={saving || !draft.trim()} onClick={() => void submit(review.id)}>{saving ? 'Đang gửi…' : 'Gửi phản hồi'}</button>
                    <button type="button" className={buttonClass('outline', 'sm')} onClick={() => setEditing(null)}>Huỷ</button>
                  </div>
                </div>
              ) : (
                <div className={layout === 'grid' ? 'mt-auto pt-space-sm' : 'mt-space-sm'}>
                  <button type="button" className={buttonClass(review.replyText ? 'outline' : 'primary', 'sm')} onClick={() => startReply(review)}>{review.replyText ? 'Sửa phản hồi' : 'Phản hồi'}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
