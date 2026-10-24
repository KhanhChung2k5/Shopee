import { useCallback, useEffect, useState } from 'react'
import { a } from '../adminUi'
import { Badge, buttonClass, cx } from '../../components/ui'
import { ApiError, apiFetch } from '../../lib/api'
import { timeVi } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'

interface StaffReview {
  id: string
  rating: number
  comment: string | null
  replyText: string | null
  createdAt: string
  buyerName: string | null
  productName: string | null
  orderId: string
  repliedByName: string | null
}

type Filter = 'unreplied' | 'all'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#f59e0b] tracking-tight" aria-label={`${rating}/5 sao`}>
      {'★'.repeat(rating)}<span className="text-outline-variant">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/** Đánh giá sản phẩm (p4-14): sales / CSKH / admin xem đánh giá của khách và phản hồi. */
export default function AdminReviewsPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState<Filter>('unreplied')
  const [reviews, setReviews] = useState<StaffReview[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!token) return
    apiFetch<StaffReview[]>(`/reviews/manage?unreplied=${filter === 'unreplied'}`, {}, token)
      .then((data) => { setReviews(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được đánh giá'))
  }, [token, filter])

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
        <h1 className="!mb-0">Đánh giá sản phẩm</h1>
      </div>
      <div className={cx(a.filterBar, 'mb-space-md')}>
        {([['unreplied', 'Chưa phản hồi'], ['all', 'Tất cả']] as const).map(([key, label]) => (
          <button key={key} type="button" className={buttonClass(filter === key ? 'primary' : 'outline', 'sm')} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      {!reviews && <div className={a.empty}>Đang tải…</div>}
      {reviews?.length === 0 && (
        <div className={a.empty}>{filter === 'unreplied' ? 'Không còn đánh giá nào chờ phản hồi.' : 'Chưa có đánh giá nào.'}</div>
      )}

      <div className="space-y-space-md">
        {reviews?.map((r) => (
          <div key={r.id} className={a.card}>
            <div className="flex flex-wrap items-start justify-between gap-space-sm">
              <div>
                <div className="font-title-md text-title-md text-on-surface">{r.productName ?? 'Sản phẩm'}</div>
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
