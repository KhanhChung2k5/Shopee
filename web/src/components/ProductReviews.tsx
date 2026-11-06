import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from '../state/AuthContext'
import { Card, CardTitle, inputClass } from './ui'

interface ProductReview {
  id: string
  rating: number
  comment: string | null
  replyText: string | null
  createdAt: string
  buyerName: string | null
  productName: string | null
}

interface ProductReviews {
  averageRating: number | null
  reviewCount: number
  /** [1 star, 2 stars, …, 5 stars] */
  starCounts: number[]
  reviews: ProductReview[]
}

const PAGE = 5

function Stars({ value, size = 'text-base' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex text-primary" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={`material-symbols-outlined ${size}`}
          style={star <= Math.round(value) ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
      ))}
    </span>
  )
}

/** Buyers' reviews of one product (GET /reviews/product/{id}): average, star breakdown, then the reviews with the shop's replies. */
export default function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductReviews | null>(null)
  const [failed, setFailed] = useState(false)
  const [star, setStar] = useState<number | null>(null)
  const [shown, setShown] = useState(PAGE)
  const { token, user } = useAuth()
  const { hash } = useLocation()
  // Sales, CS and admin answer reviews here as on the admin page (PATCH /reviews/{id}/reply).
  const canReply = user?.role === 'staff' && user.department === 'cs'

  const setReply = (id: string, replyText: string) =>
    setData((current) => current && { ...current, reviews: current.reviews.map((r) => (r.id === id ? { ...r, replyText } : r)) })

  useEffect(() => {
    let active = true
    setData(null)
    setFailed(false)
    setStar(null)
    setShown(PAGE)
    apiFetch<ProductReviews>(`/reviews/product/${productId}`)
      .then((result) => { if (active) setData(result) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [productId])

  // Link from the homepage review showcase (…#danh-gia): scroll to the reviews once they are loaded.
  useEffect(() => {
    if (data && hash === '#danh-gia') document.getElementById('danh-gia')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data, hash])

  const list = data ? data.reviews.filter((r) => star == null || r.rating === star) : []

  return (
    <Card as="section" id="danh-gia" className="scroll-mt-24" aria-labelledby="product-reviews-title">
      <CardTitle icon="reviews"><span id="product-reviews-title">Đánh giá sản phẩm</span></CardTitle>
      {failed && <p className="font-body-md text-body-md text-on-surface-variant">Không tải được đánh giá.</p>}
      {!failed && !data && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải đánh giá…</p>}
      {data && data.reviewCount === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sản phẩm chưa có đánh giá. Khách đã nhận hàng có thể chấm sao trong trang chi tiết đơn hàng.
        </p>
      )}
      {data && data.reviewCount > 0 && (
        <div className="space-y-space-md">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-space-lg items-center rounded-lg bg-surface-container-low p-space-md">
            <div className="text-center sm:pr-space-lg sm:border-r sm:border-line">
              <div className="font-headline-lg text-headline-lg text-primary">
                {data.averageRating?.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="font-body-lg text-body-lg text-on-surface-variant"> / 5</span>
              </div>
              <Stars value={data.averageRating ?? 0} size="text-xl" />
              <div className="font-label-md text-label-md text-on-surface-variant">{data.reviewCount} đánh giá</div>
            </div>
            <div className="flex flex-wrap gap-space-xs" role="group" aria-label="Lọc theo số sao">
              <button type="button" aria-pressed={star == null} onClick={() => { setStar(null); setShown(PAGE) }}
                className={`rounded-lg border px-space-md py-1.5 font-label-md text-label-md cursor-pointer ${star == null ? 'border-primary text-primary bg-primary-fixed/40' : 'border-line text-on-surface hover:border-primary'}`}>
                Tất cả ({data.reviewCount})
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button key={s} type="button" aria-pressed={star === s} disabled={data.starCounts[s - 1] === 0}
                  onClick={() => { setStar(s); setShown(PAGE) }}
                  className={`rounded-lg border px-space-md py-1.5 font-label-md text-label-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${star === s ? 'border-primary text-primary bg-primary-fixed/40' : 'border-line text-on-surface hover:border-primary'}`}>
                  {s} sao ({data.starCounts[s - 1]})
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-line">
            {list.slice(0, shown).map((review) => {
              const name = review.buyerName?.trim() || 'Khách hàng'
              return (
                <li key={review.id} className="py-space-md space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[50%] bg-primary/15 font-title-md text-title-md text-primary">{name.charAt(0).toUpperCase()}</span>
                    <span className="font-title-md text-title-md text-on-surface">{name}</span>
                    <span className="inline-flex items-center gap-0.5 rounded bg-secondary-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-secondary-container">
                      <span className="material-symbols-outlined text-xs" aria-hidden="true">verified</span>Đã mua hàng
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <Stars value={review.rating} />
                  {review.comment?.trim() && <p className="font-body-md text-body-md text-on-surface">{review.comment}</p>}
                  {canReply && token
                    ? <ReplyBox reviewId={review.id} reply={review.replyText} token={token} onSaved={(text) => setReply(review.id, text)} />
                    : review.replyText && (
                      <div className="rounded-lg border-l-4 border-primary bg-surface-container-low px-space-md py-space-sm">
                        <div className="font-label-md text-label-md text-primary">Phản hồi của Chợ Tốt Mua</div>
                        <p className="font-body-md text-body-md text-on-surface">{review.replyText}</p>
                      </div>
                    )}
                </li>
              )
            })}
          </ul>
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)}
              className="w-full rounded-lg bg-surface-container-low py-2 font-title-md text-title-md text-on-surface hover:bg-surface-container cursor-pointer">
              Xem thêm đánh giá ({list.length - shown})
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

/** Staff only: the shop's reply under a review, written or changed in place. */
function ReplyBox({ reviewId, reply, token, onSaved }: { reviewId: string; reply: string | null; token: string; onSaved: (text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reply ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const value = text.trim()
    if (!value) {
      setError('Nhập nội dung phản hồi')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/reviews/${reviewId}/reply`, { method: 'PATCH', body: JSON.stringify({ replyText: value }) }, token)
      onSaved(value)
      setEditing(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được phản hồi')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="rounded-lg border-l-4 border-primary bg-surface-container-low px-space-md py-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <span className="font-label-md text-label-md text-primary">{reply ? 'Phản hồi của Chợ Tốt Mua' : 'Chưa phản hồi'}</span>
          <button type="button" onClick={() => { setText(reply ?? ''); setEditing(true) }}
            className="inline-flex items-center gap-0.5 font-label-md text-label-md text-primary hover:underline cursor-pointer">
            <span className="material-symbols-outlined text-base" aria-hidden="true">{reply ? 'edit' : 'reply'}</span>{reply ? 'Sửa phản hồi' : 'Phản hồi'}
          </button>
        </div>
        {reply && <p className="font-body-md text-body-md text-on-surface">{reply}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-primary bg-surface-container-low p-space-sm space-y-space-xs">
      <label className="font-label-md text-label-md text-primary" htmlFor={`reply-${reviewId}`}>Phản hồi của Chợ Tốt Mua (hiển thị công khai)</label>
      <textarea id={`reply-${reviewId}`} className={inputClass} rows={3} maxLength={2000} value={text} disabled={saving}
        onChange={(e) => setText(e.target.value)} placeholder="Cảm ơn bạn đã tin tưởng Chợ Tốt Mua…" />
      {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
      <div className="flex justify-end gap-space-xs">
        <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(null) }}
          className="rounded-lg border border-line px-space-md py-1.5 font-title-md text-title-md cursor-pointer">Huỷ</button>
        <button type="button" disabled={saving} onClick={() => void save()}
          className="rounded-lg bg-primary px-space-md py-1.5 font-title-md text-title-md text-on-primary cursor-pointer disabled:opacity-60">
          {saving ? 'Đang lưu…' : 'Lưu phản hồi'}
        </button>
      </div>
    </div>
  )
}
