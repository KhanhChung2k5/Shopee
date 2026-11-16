import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { RFM_LABEL, RFM_TONE } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'
import { canAccessSection, type Department } from '../access'
import { a, statusPillClass } from '../adminUi'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, orderCode, type StaffOrderSummary } from '../orders'
import { Badge, cx } from '../../components/ui'

/**
 * Cùng ngưỡng với RfmClassifier ở backend: thang 1–5, rồi mới xếp nhóm.
 * Khách chưa có đơn đã giao (còn tiền sau hoàn) thì chưa chấm.
 */
function recencyScore(days: number | null): number {
  if (days == null || days > 180) return 1
  if (days <= 30) return 5
  if (days <= 60) return 4
  if (days <= 90) return 3
  return 2
}

function frequencyScore(orderCount: number): number {
  if (orderCount <= 1) return 1
  if (orderCount === 2) return 2
  if (orderCount <= 4) return 3
  if (orderCount <= 7) return 4
  return 5
}

function monetaryScore(amount: number): number {
  if (amount < 500_000) return 1
  if (amount < 1_500_000) return 2
  if (amount < 4_000_000) return 3
  if (amount < 8_000_000) return 4
  return 5
}

const RECENCY_BAND = ['', 'Hơn 180 ngày', '91–180 ngày', '61–90 ngày', '31–60 ngày', '0–30 ngày']
const FREQUENCY_BAND = ['', '0–1 đơn', '2 đơn', '3–4 đơn', '5–7 đơn', 'Từ 8 đơn']
const MONETARY_BAND = ['', 'Dưới 500 nghìn', 'Dưới 1,5 triệu', 'Dưới 4 triệu', 'Dưới 8 triệu', 'Từ 8 triệu']

const DAY_MS = 86_400_000

function daysSince(iso: string | null, now = new Date()): number | null {
  if (!iso) return null
  const parsed = new Date(iso.length <= 10 ? `${iso.slice(0, 10)}T00:00:00` : iso)
  if (Number.isNaN(parsed.getTime())) return null
  const from = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.round((today - from) / DAY_MS))
}

function netOf(order: StaffOrderSummary): number {
  return Math.max(0, Number(order.totalAmount) - Number(order.refundedAmount ?? 0))
}

function grossOf(order: StaffOrderSummary): number {
  return Math.max(0, Number(order.totalAmount) || 0)
}

/** Đơn đã giao và còn tiền sau hoàn — đúng tập đơn dùng để chấm F và M. */
function countsForRfm(order: StaffOrderSummary): boolean {
  return order.status === 'delivered' && netOf(order) > 0
}

/** Cột đậm hiện tiền còn lại. Cột nhạt vẫn hiện giá trị đơn, dù không cộng vào M. */
function chartValue(order: StaffOrderSummary): number {
  return countsForRfm(order) ? netOf(order) : grossOf(order)
}

function scoreFill(score: number): string {
  if (score >= 4) return 'bg-secondary'
  if (score <= 2) return 'bg-error'
  return 'bg-primary'
}

function scoreText(score: number): string {
  if (score >= 4) return 'text-secondary'
  if (score <= 2) return 'text-error'
  return 'text-primary'
}

function shortVnd(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    const digits = millions >= 10 ? 0 : 1
    return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: digits })} tr`
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000).toLocaleString('vi-VN')} nghìn`
  return formatVnd(amount)
}

const timeVi = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

const dayVi = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

interface RfmDetail {
  customer: { fullName: string | null }
  rfmSegment: string | null
  lastPurchaseAt: string | null
  orders: StaffOrderSummary[]
}

function ScoreCard({ letter, title, score, fact, band }: {
  letter: string
  title: string
  score: number | null
  fact: string
  band: string
}) {
  return (
    <div className="rounded-xl bg-surface-container-low p-space-sm sm:p-space-md">
      <div className="flex items-center justify-between gap-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed font-title-md text-title-md text-on-primary-fixed">{letter}</span>
        <span className="font-label-md text-label-md text-on-surface-variant">{title}</span>
      </div>
      <div className={cx('mt-2 font-headline-lg text-headline-lg leading-none', score == null ? 'text-on-surface-variant' : scoreText(score))}>
        {score == null ? '—' : score}
        {score != null && <span className="ml-0.5 font-label-md text-label-md text-on-surface-variant">/ 5</span>}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={cx('h-1.5 flex-1 rounded-full', score != null && index < score ? scoreFill(score) : 'bg-surface-container-highest')} />
        ))}
      </div>
      <p className="mt-2 font-label-md text-label-md text-on-surface">{fact}</p>
      <p className="font-label-sm text-label-sm text-on-surface-variant">{band}</p>
    </div>
  )
}

/** Panel hồ sơ RFM: điểm R, F, M rồi lịch sử giá trị từng đơn. */
export default function RfmCustomerPanel({ customerId, name, ageLabel, genderLabel, segment, onClose }: {
  customerId: string
  name: string | null
  ageLabel: string
  genderLabel: string
  segment: string | null
  onClose: () => void
}) {
  const { token, user } = useAuth()
  const [detail, setDetail] = useState<RfmDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const canOpenOrder = canAccessSection('/admin/don-hang', (user?.department ?? null) as Department | null)

  useEffect(() => {
    let active = true
    setDetail(null)
    setError(null)
    apiFetch<RfmDetail>(`/customers/${customerId}/detail`, {}, token)
      .then((data) => { if (active) setDetail(data) })
      .catch((e) => { if (active) setError(e instanceof ApiError ? e.message : 'Không tải được hồ sơ RFM') })
    return () => { active = false }
  }, [customerId, token])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const view = useMemo(() => {
    const orders = detail?.orders ?? []
    const kept = orders.filter(countsForRfm)
    const excluded = orders.filter((order) => !countsForRfm(order))
    const monetary = kept.reduce((sum, order) => sum + netOf(order), 0)
    const excludedValue = excluded.reduce((sum, order) => sum + grossOf(order), 0)
    const latestKept = kept.reduce<string | null>((latest, order) => (
      latest == null || order.createdAt > latest ? order.createdAt : latest
    ), null)
    const days = daysSince(detail?.lastPurchaseAt ?? latestKept)
    const scored = kept.length > 0
    const chronological = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const recent = [...chronological].reverse()
    const peak = Math.max(0, ...chronological.map(chartValue))
    return {
      scored,
      recency: scored ? recencyScore(days) : null,
      frequency: scored ? frequencyScore(kept.length) : null,
      monetaryScore: scored ? monetaryScore(monetary) : null,
      days,
      keptCount: kept.length,
      excludedCount: excluded.length,
      monetary,
      excludedValue,
      chronological,
      recent,
      peak,
    }
  }, [detail])

  const shownSegment = detail?.rfmSegment ?? segment
  const title = detail?.customer.fullName ?? name ?? 'Khách hàng'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfm-panel-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-space-md border-b border-line px-space-lg py-space-md">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h2 id="rfm-panel-title" className="font-headline-md text-headline-md text-on-surface">{title}</h2>
              <Badge tone={RFM_TONE[shownSegment ?? 'other'] ?? 'neutral'}>{RFM_LABEL[shownSegment ?? 'other'] ?? shownSegment}</Badge>
            </div>
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">{ageLabel} · {genderLabel}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="material-symbols-outlined rounded-lg p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer"
          >
            close
          </button>
        </div>

        <div className="flex-1 space-y-space-lg overflow-y-auto p-space-lg">
          {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
          {!detail && !error && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải chỉ số…</p>}

          {detail && (
            <>
              <section aria-labelledby="rfm-scores-title">
                <h3 id="rfm-scores-title" className="font-title-md text-title-md text-on-surface">Chỉ số R, F, M</h3>
                <p className="mb-space-sm font-body-md text-body-md text-on-surface-variant">
                  {view.scored
                    ? 'Thang 1–5. R là số ngày từ lần giao cuối, F là số đơn đã giao, M là tiền còn lại sau hoàn.'
                    : 'Khách chưa có đơn đã giao còn tiền sau hoàn, nên chưa chấm R, F, M.'}
                </p>
                <div className="grid grid-cols-3 gap-space-sm">
                  <ScoreCard
                    letter="R"
                    title="Độ gần"
                    score={view.recency}
                    fact={view.days == null ? 'Chưa có lần giao' : `${view.days} ngày từ lần giao cuối`}
                    band={view.recency == null ? 'Chưa chấm' : RECENCY_BAND[view.recency]}
                  />
                  <ScoreCard
                    letter="F"
                    title="Tần suất"
                    score={view.frequency}
                    fact={`${view.keptCount} đơn đã giao`}
                    band={view.frequency == null ? 'Chưa chấm' : FREQUENCY_BAND[view.frequency]}
                  />
                  <ScoreCard
                    letter="M"
                    title="Giá trị"
                    score={view.monetaryScore}
                    fact={formatVnd(view.monetary)}
                    band={view.monetaryScore == null ? 'Chưa chấm' : MONETARY_BAND[view.monetaryScore]}
                  />
                </div>
              </section>

              <section aria-labelledby="rfm-history-title" className={a.card}>
                <h3 id="rfm-history-title" className="font-title-md text-title-md text-on-surface">Lịch sử giá trị đơn hàng</h3>
                <p className="mb-space-md font-body-md text-body-md text-on-surface-variant">
                  Mỗi cột là một đơn, từ đơn cũ đến đơn mới. Cột đậm là tiền còn lại sau hoàn, tính vào M. Cột nhạt là giá trị đơn không tính vào M.
                </p>
                {view.chronological.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">Khách chưa có đơn hàng nào.</p>
                ) : (
                  <>
                    <div className="mb-space-sm flex flex-wrap gap-space-md font-label-md text-label-md text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Tính vào M</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-outline-variant" />Không tính vào M</span>
                    </div>
                    <div className="overflow-x-auto pb-1">
                      <div
                        className="flex h-44 min-w-full items-end gap-2"
                        role="img"
                        aria-label={`Lịch sử ${view.chronological.length} đơn, tổng tính vào M ${formatVnd(view.monetary)}${view.excludedCount > 0 ? `, không tính vào M ${formatVnd(view.excludedValue)}` : ''}`}
                      >
                        {view.chronological.map((order) => {
                          const counted = countsForRfm(order)
                          const value = chartValue(order)
                          const height = view.peak <= 0 ? 8 : Math.max(8, Math.round((value / view.peak) * 100))
                          return (
                            <div key={order.id} className="flex w-16 shrink-0 flex-col items-center gap-1">
                              <span className={cx('max-w-full truncate font-label-sm text-label-sm', counted ? 'text-on-surface' : 'text-on-surface-variant')}>{shortVnd(value)}</span>
                              <div className="flex h-28 w-full items-end">
                                <div
                                  className={cx('w-full rounded-t', counted ? 'bg-primary' : 'bg-outline-variant')}
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">{dayVi(order.createdAt)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <p className="mb-space-sm mt-space-md font-label-md text-label-md text-on-surface-variant">
                      {view.keptCount} đơn tính vào M · tổng {formatVnd(view.monetary)}
                      {view.excludedCount > 0 && <> · {view.excludedCount} đơn không tính vào M · {formatVnd(view.excludedValue)}</>}
                    </p>
                    <ul className="divide-y divide-line">
                      {view.recent.map((order) => {
                        const counted = countsForRfm(order)
                        const value = chartValue(order)
                        const code = orderCode(order.id)
                        return (
                          <li key={order.id} className="flex items-start justify-between gap-space-md py-2.5">
                            <div className="min-w-0">
                              {canOpenOrder
                                ? <Link className="font-semibold text-primary underline" to={`/admin/don-hang/${order.id}`}>{code}</Link>
                                : <span className="font-semibold text-on-surface">{code}</span>}
                              <div className="font-body-md text-body-md text-on-surface-variant">{timeVi(order.createdAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className={cx('whitespace-nowrap font-semibold', counted ? 'text-on-surface' : 'text-on-surface-variant')}>{formatVnd(value)}</div>
                              {order.refundedAmount > 0 && (
                                <div className="font-label-sm text-label-sm text-error">Đã hoàn {formatVnd(order.refundedAmount)}</div>
                              )}
                              {!counted && (
                                <div className="font-label-sm text-label-sm text-on-surface-variant">Không tính vào M</div>
                              )}
                              <span className={statusPillClass(ORDER_STATUS_TONE[order.status])}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
