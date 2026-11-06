import { Fragment, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Badge, cx } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { SURVEY_STATUS_LABEL, fetchSurveyStats, fetchSurveys, timeVi, type Survey, type SurveyStats } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'
import { a } from '../adminUi'
import { RecentViews, SearchBox, StatusFilter } from '../components/ListSearch'
import { matches, useRecentViews } from '../components/listSearchState'

interface Row { survey: Survey; stats: SurveyStats | null }

/** Điểm trung bình của các câu chấm điểm 1–5 trong một khảo sát (null nếu chưa ai chấm). */
function averageRating(stats: SurveyStats | null) {
  let sum = 0
  let count = 0
  for (const q of stats?.questions ?? []) {
    if (q.answerType !== 'rating') continue
    for (const b of q.buckets) { sum += Number(b.value) * b.count; count += b.count }
  }
  return count ? sum / count : null
}

/** Tab chung của khu báo cáo khách hàng (CSKH). */
export function CustomerReportTabs() {
  const tab = ({ isActive }: { isActive: boolean }) => cx('-mb-px border-b-2 px-1 py-space-sm font-title-md text-title-md transition-colors',
    isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface')
  return (
    <nav aria-label="Báo cáo khách hàng" className="mb-space-lg flex gap-space-lg border-b border-line">
      <NavLink end to="/admin/bao-cao" className={tab}>Nhân khẩu học</NavLink>
      <NavLink to="/admin/bao-cao/khao-sat" className={tab}>Thống kê khảo sát</NavLink>
    </nav>
  )
}

function Bar({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,180px)_1fr_56px] items-center gap-2.5 font-body-md text-body-md text-on-surface">
      <span className="truncate" title={label}>{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="text-right font-bold">{Number.isInteger(value) ? value : value.toFixed(1)}{suffix}</span>
    </div>
  )
}

/** Báo cáo tổng hợp mọi khảo sát đã gửi: lượt mời, phản hồi, tỉ lệ hoàn thành, mức hài lòng và kết quả từng câu. */
export default function AdminSurveyStatsPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'sent' | 'closed'>('all')
  const viewed = useRecentViews('survey-stats')

  useEffect(() => {
    if (!token) return
    let active = true
    fetchSurveys(token)
      .then(async ({ surveys }) => {
        // Khảo sát nháp chưa gửi cho ai nên không có số liệu.
        const published = surveys.filter((s) => s.status !== 'draft')
        const stats = await Promise.all(published.map((s) => fetchSurveyStats(token, s.id).catch(() => null)))
        if (active) setRows(published.map((survey, i) => ({ survey, stats: stats[i] })))
      })
      .catch((e) => { if (active) setError(e instanceof ApiError ? e.message : 'Không tải được khảo sát') })
    return () => { active = false }
  }, [token])

  const totals = useMemo(() => {
    const all = rows ?? []
    const invited = all.reduce((n, r) => n + (r.stats?.invitedCount ?? 0), 0)
    const submitted = all.reduce((n, r) => n + (r.stats?.submittedCount ?? 0), 0)
    const stars = [0, 0, 0, 0, 0]
    for (const r of all) for (const q of r.stats?.questions ?? []) {
      if (q.answerType !== 'rating') continue
      for (const b of q.buckets) { const v = Number(b.value); if (v >= 1 && v <= 5) stars[v - 1] += b.count }
    }
    const rated = stars.reduce((n, c) => n + c, 0)
    const avg = rated ? stars.reduce((n, c, i) => n + c * (i + 1), 0) / rated : null
    const satisfied = rated ? Math.round(((stars[3] + stars[4]) / rated) * 100) : null
    return { count: all.length, invited, submitted, completion: invited ? Math.round((submitted / invited) * 100) : 0, stars, rated, avg, satisfied }
  }, [rows])

  const shown = useMemo(() => rows?.filter((r) => (status === 'all' || r.survey.status === status)
    && matches(query, r.survey.title, r.survey.description, ...r.survey.questions.map((q) => q.questionText))) ?? null, [rows, status, query])

  const toggle = (r: Row) => {
    if (expanded === r.survey.id) { setExpanded(null); return }
    setExpanded(r.survey.id)
    viewed.push(r.survey.id, r.survey.title)
  }

  const kpis: [string, string][] = [
    ['Khảo sát đã gửi', String(totals.count)],
    ['Lượt mời', totals.invited.toLocaleString('vi-VN')],
    ['Lượt trả lời', totals.submitted.toLocaleString('vi-VN')],
    ['Tỉ lệ hoàn thành', `${totals.completion}%`],
    ['Điểm hài lòng TB', totals.avg == null ? '—' : `${totals.avg.toFixed(2)} / 5`],
    ['Khách hài lòng (4–5★)', totals.satisfied == null ? '—' : `${totals.satisfied}%`],
  ]

  return (
    <div>
      <h1>Báo cáo khách hàng</h1>
      <CustomerReportTabs />
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      <div className={a.statRow}>
        {kpis.map(([label, value]) => (
          <div key={label} className={a.card}>
            <div className={a.statLabel}>{label}</div>
            <div className={a.statValue}>{rows ? value : '…'}</div>
          </div>
        ))}
      </div>

      <div className="mb-space-lg grid grid-cols-1 gap-space-md lg:grid-cols-2">
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Tỉ lệ hoàn thành theo khảo sát</div>
          {!rows ? <p className="font-body-md text-body-md text-on-surface-variant">Đang tải…</p>
            : rows.length === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Chưa có khảo sát nào được gửi.</p>
              : <div className="flex flex-col gap-2.5">{rows.map((r) => <Bar key={r.survey.id} label={r.survey.title} value={r.stats?.completionPercent ?? 0} max={100} suffix="%" />)}</div>}
        </div>
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Phân bố điểm chấm (mọi câu chấm điểm 1–5)</div>
          {totals.rated === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">{rows ? 'Chưa có lượt chấm điểm nào.' : 'Đang tải…'}</p>
            : <div className="flex flex-col gap-2.5">{[5, 4, 3, 2, 1].map((star) => <Bar key={star} label={`${star} ★`} value={totals.stars[star - 1]} max={Math.max(...totals.stars)} />)}</div>}
        </div>
      </div>

      <div className={a.toolbar}>
        <h2 className="font-headline-md text-headline-md text-on-surface">Chi tiết từng khảo sát</h2>
        <SearchBox page="survey-stats" placeholder="Tìm khảo sát, câu hỏi..." value={query} onChange={setQuery} />
      </div>
      <StatusFilter options={[['all', 'Tất cả'], ['sent', 'Đang nhận phản hồi'], ['closed', 'Đã lưu trữ']] as const} value={status} onChange={setStatus}
        counts={{ all: rows?.length ?? 0, sent: rows?.filter((r) => r.survey.status === 'sent').length ?? 0, closed: rows?.filter((r) => r.survey.status === 'closed').length ?? 0 }} />
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={setExpanded} />

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Khảo sát</th><th>Trạng thái</th><th>Đã mời</th><th>Đã trả lời</th><th>Hoàn thành</th><th>Điểm TB</th><th /></tr></thead>
          <tbody>
            {!shown && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {shown?.length === 0 && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Không có khảo sát nào khớp bộ lọc.</td></tr>}
            {shown?.map((r) => {
              const avg = averageRating(r.stats)
              const open = expanded === r.survey.id
              return (
                <Fragment key={r.survey.id}>
                  <tr className={open ? 'is-selected' : ''}>
                    <td>
                      <div className="font-semibold">{r.survey.title}</div>
                      <div className="font-label-md text-label-md text-on-surface-variant">{r.survey.questions.length} câu hỏi · tạo {timeVi(r.survey.createdAt)}</div>
                    </td>
                    <td><Badge tone={r.survey.status === 'sent' ? 'success' : 'neutral'}>{SURVEY_STATUS_LABEL[r.survey.status] ?? r.survey.status}</Badge></td>
                    <td>{r.stats?.invitedCount ?? '—'}</td>
                    <td>{r.stats?.submittedCount ?? '—'}</td>
                    <td>{r.stats ? `${r.stats.completionPercent}%` : '—'}</td>
                    <td>{avg == null ? '—' : `${avg.toFixed(2)} ★`}</td>
                    <td><button type="button" className={a.linkButton} onClick={() => toggle(r)}>{open ? 'Thu gọn' : 'Xem kết quả'}</button></td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="!bg-surface-container-low">
                        {!r.stats ? <span className="text-error">Không tải được số liệu khảo sát này.</span>
                          : r.stats.questions.length === 0 ? 'Khảo sát chưa có câu hỏi.'
                            : (
                              <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
                                {r.stats.questions.map((q) => (
                                  <div key={q.questionId} className="space-y-space-xs rounded-lg bg-surface-container-lowest p-space-md">
                                    <p className="font-title-md text-title-md text-on-surface">{q.questionText} <span className="font-normal text-on-surface-variant">({q.answerCount} trả lời)</span></p>
                                    {q.buckets.map((b) => (
                                      <Bar key={b.value} label={q.answerType === 'rating' ? `${b.value} ★` : b.value} value={b.count} max={Math.max(1, ...q.buckets.map((x) => x.count))} />
                                    ))}
                                    {q.texts.length > 0 && (
                                      <ul className="space-y-1">
                                        {q.texts.slice(0, 5).map((t, i) => <li key={i} className="rounded-lg bg-surface-container-low px-space-sm py-space-xs font-body-md text-body-md">“{t}”</li>)}
                                        {q.texts.length > 5 && <li className="font-label-md text-label-md text-on-surface-variant">… và {q.texts.length - 5} ý kiến khác</li>}
                                      </ul>
                                    )}
                                    {q.answerCount === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Chưa có ai trả lời câu này.</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
