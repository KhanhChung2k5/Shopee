import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { a } from '../adminUi'
import { Badge, buttonClass, cx } from '../../components/ui'
import { ApiError, apiFetch } from '../../lib/api'
import { timeVi } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'
import { RecentViews, SearchBox, StatusFilter } from '../components/ListSearch'
import { matches, useRecentViews } from '../components/listSearchState'

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
}

type Filter = 'unreplied' | 'replied' | 'all'
const FILTERS = [['unreplied', 'Chờ phản hồi'], ['replied', 'Đã phản hồi'], ['all', 'Tất cả']] as const

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#f59e0b] tracking-tight" aria-label={`${rating}/5 sao`}>
      {'★'.repeat(rating)}<span className="text-outline-variant">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/** Đánh giá sản phẩm (p4-14): CSKH xem đánh giá của khách, lọc theo sản phẩm / số sao và phản hồi. */
export default function AdminReviewsPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState<Filter>('unreplied')
  const [reviews, setReviews] = useState<StaffReview[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [star, setStar] = useState(0)
  const viewed = useRecentViews('reviews')

  const load = useCallback(() => {
    if (!token) return
    apiFetch<StaffReview[]>('/reviews/manage', {}, token)
      .then((data) => { setReviews(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đánh giá'))
  }, [token])

  /** Sản phẩm có đánh giá, kèm số đánh giá — cho ô lọc theo sản phẩm. */
  const products = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const r of reviews ?? []) {
      if (!r.productId) continue
      const entry = map.get(r.productId) ?? { name: r.productName ?? 'Sản phẩm', count: 0 }
      entry.count += 1
      map.set(r.productId, entry)
    }
    return [...map.entries()].sort((x, y) => x[1].name.localeCompare(y[1].name, 'vi'))
  }, [reviews])

  const counts = useMemo(() => ({
    all: reviews?.length ?? 0,
    unreplied: reviews?.filter((r) => !r.replyText).length ?? 0,
    replied: reviews?.filter((r) => r.replyText).length ?? 0,
  }), [reviews])

  const shown = useMemo(() => reviews?.filter((r) =>
    (filter === 'all' || (filter === 'unreplied' ? !r.replyText : !!r.replyText))
    && (!productId || r.productId === productId)
    && (!star || r.rating === star)
    && matches(query, r.productName, r.buyerName, r.comment, r.replyText, r.orderId.slice(0, 8))) ?? null,
  [reviews, filter, productId, star, query])

  useEffect(load, [load])

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

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Đánh giá sản phẩm ({shown?.length ?? 0})</h1>
        <SearchBox page="reviews" placeholder="Tìm sản phẩm, khách, nội dung..." value={query} onChange={setQuery} />
      </div>
      <StatusFilter options={FILTERS} value={filter} onChange={setFilter} counts={counts} className="!mb-space-sm" />
      <div className={cx(a.filterBar, 'mb-space-md')}>
        <select aria-label="Lọc theo sản phẩm" className={cx(a.input, '!w-auto max-w-[320px]')} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Tất cả sản phẩm ({products.length})</option>
          {products.map(([id, p]) => <option key={id} value={id}>{p.name} ({p.count})</option>)}
        </select>
        <select aria-label="Lọc theo số sao" className={cx(a.input, '!w-auto')} value={star} onChange={(e) => setStar(Number(e.target.value))}>
          <option value={0}>Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
        </select>
        {(productId || star > 0 || query) && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => { setProductId(''); setStar(0); setQuery('') }}>Xoá bộ lọc</button>}
      </div>
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => window.open(`/san-pham/${id}`, '_blank', 'noopener')} />
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      {!reviews && <div className={a.empty}>Đang tải…</div>}
      {shown?.length === 0 && (
        <div className={a.empty}>{filter === 'unreplied' && !productId && !star && !query ? 'Không còn đánh giá nào chờ phản hồi.' : 'Không có đánh giá nào khớp bộ lọc.'}</div>
      )}

      <div className="space-y-space-md">
        {shown?.map((r) => (
          <div key={r.id} className={a.card}>
            <div className="flex flex-wrap items-start justify-between gap-space-sm">
              <div>
                {r.productId ? (
                  <Link to={`/san-pham/${r.productId}`} target="_blank" rel="noopener" title="Mở trang sản phẩm (tab mới)"
                    onClick={() => viewed.push(r.productId!, r.productName ?? 'Sản phẩm')}
                    className="inline-flex items-center gap-1 font-title-md text-title-md text-primary hover:underline">
                    {r.productName ?? 'Sản phẩm'}<span className="material-symbols-outlined !text-base">open_in_new</span>
                  </Link>
                ) : <div className="font-title-md text-title-md text-on-surface">{r.productName ?? 'Sản phẩm'}</div>}
                <div className="font-body-md text-body-md text-on-surface-variant">
                  {r.buyerName ?? 'Khách hàng'} · {timeVi(r.createdAt)} · Đơn #{r.orderId.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <Stars rating={r.rating} />
                {r.replyText ? <Badge tone="success">Đã phản hồi</Badge> : <Badge tone="danger">Chờ phản hồi</Badge>}
              </div>
            </div>

            <p className="mt-space-sm font-body-lg text-body-lg text-on-surface whitespace-pre-line">
              {r.comment?.trim() ? r.comment : <span className="text-on-surface-variant italic">Khách không để lại bình luận.</span>}
            </p>

            {r.replyText && editing !== r.id && (
              <div className="mt-space-sm rounded-lg bg-surface-container-low p-space-sm border-l-4 border-primary">
                <div className="font-label-md text-label-md text-primary">Phản hồi của shop{r.repliedByName ? ` · ${r.repliedByName}` : ''}</div>
                <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">{r.replyText}</p>
              </div>
            )}

            {editing === r.id ? (
              <div className="mt-space-sm space-y-space-xs">
                <textarea className={a.input} rows={3} maxLength={2000} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Cảm ơn bạn đã đánh giá…" />
                <div className={a.rowActions}>
                  <button type="button" className={buttonClass('primary', 'sm')} disabled={saving || !draft.trim()} onClick={() => void submit(r.id)}>{saving ? 'Đang gửi…' : 'Gửi phản hồi'}</button>
                  <button type="button" className={buttonClass('outline', 'sm')} onClick={() => setEditing(null)}>Huỷ</button>
                </div>
              </div>
            ) : (
              <div className="mt-space-sm">
                <button type="button" className={buttonClass(r.replyText ? 'outline' : 'primary', 'sm')} onClick={() => startReply(r)}>{r.replyText ? 'Sửa phản hồi' : 'Phản hồi'}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
