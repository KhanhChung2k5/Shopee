import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { a } from '../../adminUi'
import { canAccessSection, type Department } from '../../access'
import { ApiError } from '../../../lib/api'
import { useAuth } from '../../../state/AuthContext'
import {
  RFM_LABEL, fetchCampaigns, fetchConversations, fetchCustomerReport, fetchSurveyStats, fetchSurveys,
  type Campaign, type ConversationSummary, type CustomerReport, type Survey, type SurveyStats,
} from '../../../lib/crm'

const RESPONSE_TARGET = 50
const CSAT_TARGET = 3.5
const SLA_TARGET = 90
const BLOCKS = 22

const HATCH: CSSProperties = { backgroundImage: 'repeating-linear-gradient(-45deg, #d6d3d1 0 1px, #f3f1ee 1px 4px)' }
const HATCH_DARK: CSSProperties = { backgroundImage: 'repeating-linear-gradient(-45deg, #3a3f48 0 1px, #2a2e35 1px 5px)' }
const STRIPE: CSSProperties = {
  backgroundColor: 'rgba(255,255,255,.28)',
  backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.7) 0 3px, transparent 3px 7px)',
}

type SentSurvey = Survey & { stats?: SurveyStats }

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function formatNum(value: number, digits = 1) {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 1) })
}

function deltaOf(current: number | null, previous: number | null) {
  if (current == null || previous == null) return null
  return round1(current - previous)
}

function csatOf(stats?: SurveyStats) {
  if (!stats) return null
  let weighted = 0
  let count = 0
  for (const question of stats.questions) {
    if (question.answerType !== 'rating') continue
    for (const bucket of question.buckets) {
      const score = Number(bucket.value)
      if (!Number.isFinite(score)) continue
      weighted += score * bucket.count
      count += bucket.count
    }
  }
  return count === 0 ? null : round1(weighted / count)
}

function lettersOf(campaign: Campaign) {
  return campaign.sentCount + campaign.readCount
}

function openRateOf(campaign: Campaign) {
  const total = lettersOf(campaign)
  return total === 0 ? 0 : round1((campaign.readCount / total) * 100)
}

function BlockMeter({ percent, filledClass }: { percent: number; filledClass: string }) {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * BLOCKS)
  return (
    <div className="mt-1.5 flex gap-[3px]" aria-hidden>
      {Array.from({ length: BLOCKS }, (_, index) => (
        <span key={index} className={`h-3.5 min-w-0 flex-1 rounded-[3px] ${index < filled ? filledClass : ''}`} style={index < filled ? undefined : HATCH} />
      ))}
    </div>
  )
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return null
  const up = value >= 0
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-label-sm text-label-sm font-semibold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
      {up ? '↑' : '↓'} {formatNum(Math.abs(value))}
    </span>
  )
}

function Pill({ children, tone }: { children: ReactNode; tone: 'info' | 'danger' | 'ok' }) {
  const toneClass = tone === 'danger' ? 'bg-rose-50 text-rose-600' : tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
  return <span className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${toneClass}`}>{children}</span>
}

function Donut({ percent }: { percent: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)
  const stroke = percent >= SLA_TARGET ? '#12a37f' : percent === 0 ? '#e7e5e4' : '#f43f5e'
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#eeeae6" strokeWidth="12" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-headline-md text-headline-md text-on-surface">{formatNum(percent, 0)}%</div>
        <div className="font-label-sm text-label-sm text-on-surface-variant">đúng hạn</div>
      </div>
    </div>
  )
}

/** Tổng quan điều hành CRM: hàng đợi ticket, rồi 3 khảo sát và 3 thư gửi gần nhất. */
export default function AdminCrmHomePage() {
  const { token, user } = useAuth()
  const department = (user?.department ?? null) as Department | null
  const [items, setItems] = useState<ConversationSummary[] | null>(null)
  const [live, setLive] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [campaignDenied, setCampaignDenied] = useState(false)
  const [report, setReport] = useState<CustomerReport | null>(null)
  const [surveys, setSurveys] = useState<SentSurvey[] | null>(null)
  const [surveyDenied, setSurveyDenied] = useState(false)
  const [ticketDenied, setTicketDenied] = useState(false)
  const [reportDenied, setReportDenied] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchConversations(token).then((data) => { setItems(data.items); setLive(data.agentOnline) })
      .catch((error) => { setItems([]); setTicketDenied(error instanceof ApiError && error.status === 403) })
    fetchCustomerReport(token).then(setReport)
      .catch((error) => { setReport(null); setReportDenied(error instanceof ApiError && error.status === 403) })
    fetchCampaigns(token)
      .then((data) => setCampaigns(data.campaigns))
      .catch((error) => { setCampaigns([]); setCampaignDenied(error instanceof ApiError && error.status === 403) })
    fetchSurveys(token).then(async (data) => {
      const sent = data.surveys
        .filter((survey) => survey.status === 'sent' || survey.status === 'closed')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6)
      const withStats = await Promise.all(sent.map(async (survey) => {
        const stats = await fetchSurveyStats(token, survey.id).catch(() => undefined)
        return { ...survey, stats }
      }))
      setSurveys(withStats)
    }).catch((error) => { setSurveys([]); setSurveyDenied(error instanceof ApiError && error.status === 403) })
  }, [token])

  const queue = items ?? []
  const openItems = queue.filter((item) => item.status !== 'closed')
  const fresh = queue.filter((item) => item.status === 'open')
  const working = queue.filter((item) => item.status === 'in_progress')
  const closed = queue.filter((item) => item.status === 'closed')
  const breached = openItems.filter((item) => item.slaState === 'breached')
  const onTime = openItems.length - breached.length
  const slaPercent = openItems.length === 0 ? 100 : Math.round((onTime / openItems.length) * 100)
  const high = openItems.filter((item) => item.priority === 'high').length
  const normal = openItems.filter((item) => item.priority !== 'high' && item.priority !== 'low').length
  const low = openItems.filter((item) => item.priority === 'low').length
  const priorityTotal = Math.max(1, high + normal + low)
  const ticketParts = [
    { label: 'Mở', value: fresh.length, className: 'bg-white', stripe: false },
    { label: 'Đang xử lý', value: working.length, className: 'bg-cyan-300', stripe: false },
    { label: 'Đã đóng', value: closed.length, className: '', stripe: true },
  ]
  const attention = [...openItems].sort((a, b) => Number(b.slaState === 'breached') - Number(a.slaState === 'breached'))

  const recentSurveys = (surveys ?? []).slice(0, 3)
  const invited = recentSurveys.reduce((sum, survey) => sum + (survey.stats?.invitedCount ?? 0), 0)
  const submitted = recentSurveys.reduce((sum, survey) => sum + (survey.stats?.submittedCount ?? 0), 0)
  const responseRate = invited === 0 ? 0 : round1((submitted / invited) * 100)
  const responseValues = (surveys ?? []).map((survey) => survey.stats?.completionPercent ?? 0)
  const earlierInvited = (surveys ?? []).slice(3).reduce((sum, survey) => sum + (survey.stats?.invitedCount ?? 0), 0)
  const earlierSubmitted = (surveys ?? []).slice(3).reduce((sum, survey) => sum + (survey.stats?.submittedCount ?? 0), 0)
  const responseHeadlineDelta = earlierInvited === 0 ? null : deltaOf(responseRate, round1((earlierSubmitted / earlierInvited) * 100))

  const csatValues = (surveys ?? []).map((survey) => csatOf(survey.stats))
  const csatWeight = recentSurveys.reduce((sum, survey) => sum + (survey.stats?.submittedCount ?? 0), 0)
  const csatAverage = csatWeight === 0
    ? null
    : round1(recentSurveys.reduce((sum, survey) => sum + (csatOf(survey.stats) ?? 0) * (survey.stats?.submittedCount ?? 0), 0) / csatWeight)
  const csatHeadlineDelta = (surveys ?? []).length > 3 ? deltaOf(csatAverage, csatValues[3] ?? null) : null
  const monthLabel = recentSurveys[0] ? `Tháng ${new Date(recentSurveys[0].createdAt).getMonth() + 1}` : ''

  const sentCampaigns = useMemo(() => (campaigns ?? [])
    .filter((campaign) => campaign.deliveryStatus === 'sent')
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? '')), [campaigns])
  const recentCampaigns = sentCampaigns.slice(0, 3)
  const recentLetterTotal = recentCampaigns.reduce((sum, campaign) => sum + lettersOf(campaign), 0)
  const recentRead = recentCampaigns.reduce((sum, campaign) => sum + campaign.readCount, 0)
  const recentOpenRate = recentLetterTotal === 0 ? 0 : round1((recentRead / recentLetterTotal) * 100)
  const openValues = sentCampaigns.map(openRateOf)
  const openHeadlineDelta = sentCampaigns.length > 3 ? deltaOf(recentOpenRate, openValues[3] ?? null) : null
  const mailCampaigns = (campaigns ?? []).filter((campaign) => campaign.deliveryStatus !== 'draft')
  const sentDone = mailCampaigns.filter((campaign) => campaign.deliveryStatus === 'sent').length
  const allLetters = mailCampaigns.reduce((sum, campaign) => sum + lettersOf(campaign), 0)
  const squares = Math.min(48, Math.max(allLetters, 12))

  const rfm = useMemo(() => {
    const map: Record<string, number> = {}
    for (const customer of report?.customers ?? []) {
      const key = customer.rfmSegment ?? 'other'
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [report])

  const link = (path: string, label: string) => canAccessSection(path, department)
    ? <Link className="font-label-md text-label-md text-sky-600" to={path}>{label}</Link>
    : null

  return (
    <div className="space-y-space-xl">
      <section className="space-y-space-md">
        <div className="flex items-end justify-between gap-space-sm">
          <div>
            <div className="font-label-sm text-label-sm font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Ưu tiên trước</div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Ticket</h2>
          </div>
          {link('/admin/ho-tro', 'Mở hàng đợi')}
        </div>
        {ticketDenied ? (
          <div className={`${a.card} rounded-2xl font-body-md text-body-md text-on-surface-variant`}>Ticket và hàng đợi hỗ trợ do bộ phận CSKH xử lý.</div>
        ) : (<>
        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl bg-[#2f6bff] p-space-lg text-white">
            <div className="flex items-center gap-space-sm">
              <div className="font-label-md text-label-md text-white/80">Cần xử lý</div>
              {live && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-label-sm text-label-sm font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />LIVE</span>}
            </div>
            <div className="mt-1 text-5xl font-bold tracking-tight">{items ? openItems.length : '…'}</div>
            <p className="text-white/85">Hội thoại chưa đóng</p>
            <div className="mt-space-md" role="img" aria-label="Số hội thoại theo trạng thái">
              <div className="flex h-28 items-end gap-space-md">
                {ticketParts.map((part) => {
                  const max = Math.max(1, ...ticketParts.map((item) => item.value))
                  const height = part.value === 0 ? 8 : Math.round((part.value / max) * 100)
                  return (
                    <div key={part.label} className="flex h-full flex-1 items-end">
                      <div className={`w-full rounded-t-lg ${part.className}`} style={{ height: `${height}%`, ...(part.stripe ? STRIPE : undefined) }} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-space-sm flex gap-space-md text-center">
                {ticketParts.map((part) => (
                  <div key={part.label} className="min-w-0 flex-1">
                    <div className="text-lg font-bold leading-none">{items ? part.value : '…'}</div>
                    <div className="mt-1 truncate font-label-sm text-label-sm text-white/80">{part.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${a.card} rounded-2xl`}>
            <div className="flex items-center justify-between"><span className="font-title-md text-title-md text-on-surface">Hiệu suất SLA</span><span className="font-label-md text-label-md text-on-surface-variant">Mục tiêu {SLA_TARGET}%</span></div>
            <Donut percent={items ? slaPercent : 0} />
            <p className={`mb-space-md text-center font-label-md text-label-md ${slaPercent < SLA_TARGET ? 'text-rose-600' : 'text-on-surface-variant'}`}>
              {openItems.length === 0 ? 'Không có hội thoại đang mở' : slaPercent < SLA_TARGET ? `Dưới mục tiêu ${SLA_TARGET}% · ${breached.length} ticket trễ` : `Đạt mục tiêu ${SLA_TARGET}%`}
            </p>
            {[['Đúng hạn', onTime, 'bg-neutral-300'], ['Vượt SLA', breached.length, 'bg-rose-500']].map(([label, value, color]) => {
              const count = Number(value)
              const share = openItems.length === 0 ? 0 : Math.round((count / openItems.length) * 100)
              return (
                <div key={label as string} className="mt-space-sm grid grid-cols-[88px_1fr_auto] items-center gap-space-sm font-body-md text-body-md">
                  <span>{label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container"><div className={`h-full ${color}`} style={{ width: `${share}%` }} /></div>
                  <span className="tabular-nums text-on-surface-variant">{count} <span className="ml-2">{share}%</span></span>
                </div>
              )
            })}
          </div>

          <div className={`${a.card} rounded-2xl`}>
            <div className="flex items-center justify-between"><span className="font-title-md text-title-md text-on-surface">Mức ưu tiên</span><span className="font-label-md text-label-md text-on-surface-variant">Chưa đóng</span></div>
            {[['Cao', high, 'bg-rose-500'], ['Bình thường', normal, 'bg-neutral-300'], ['Thấp', low, 'bg-neutral-200']].map(([label, value, color]) => {
              const count = Number(value)
              const share = openItems.length === 0 ? 0 : Math.round((count / priorityTotal) * 100)
              return (
                <div key={label as string} className="mt-space-md grid grid-cols-[100px_1fr_auto] items-center gap-space-sm font-body-md text-body-md">
                  <span>{label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container"><div className={`h-full ${color}`} style={{ width: `${(count / priorityTotal) * 100}%` }} /></div>
                  <span className="tabular-nums text-on-surface-variant">{count} <span className="ml-2">{share}%</span></span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={`${a.card} rounded-2xl`}>
          <div className="mb-space-sm flex items-center justify-between">
            <h3 className="font-title-lg text-title-lg text-on-surface">Hội thoại cần xử lý</h3>
            <span className="font-label-md text-label-md text-on-surface-variant">{attention.length} hội thoại</span>
          </div>
          {attention.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">{items ? 'Không còn hội thoại mở.' : 'Đang tải…'}</p>}
          <ul className="divide-y divide-line">
            {attention.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-space-sm py-space-sm">
                <div className="min-w-0">
                  <div className="truncate font-title-md text-title-md text-on-surface">{item.customerName ?? 'Khách'}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant">{item.code} · {item.topicLabel}</div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Pill tone="info">{item.statusLabel}</Pill>
                  {item.priority === 'high' && <Pill tone="danger">Cao</Pill>}
                  {item.priority === 'low' && <Pill tone="info">Thấp</Pill>}
                  {item.slaState === 'breached' && <Pill tone="danger">Vượt SLA</Pill>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        </>)}
      </section>

      <section className="space-y-space-md">
        <div>
          <div className="font-label-sm text-label-sm font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Hiệu quả gần đây</div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Khảo sát · Chiến dịch · Hồ sơ</h2>
        </div>
        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-3">
          <div className={`${a.card} rounded-2xl`}>
            <div className="flex items-center justify-between"><span className="font-title-md text-title-md">Tỷ lệ phản hồi</span>{link('/admin/khao-sat', 'Khảo sát →')}</div>
            {surveyDenied ? <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Khảo sát do bộ phận CSKH theo dõi.</p> : (
              <>
                <div className="mt-space-sm flex items-end gap-space-sm">
                  <div className="text-5xl font-bold tracking-tight">{surveys ? `${formatNum(responseRate)}%` : '…'}</div>
                  <Delta value={responseHeadlineDelta} />
                </div>
                <p className="mb-space-md font-label-md text-label-md text-on-surface-variant">{recentSurveys.length} khảo sát gửi gần nhất · mục tiêu {RESPONSE_TARGET}%</p>
                {recentSurveys.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">{surveys ? 'Chưa có khảo sát đã gửi.' : 'Đang tải…'}</p>}
                {recentSurveys.map((survey, index) => (
                  <div key={survey.id} className="mb-space-sm">
                    <div className="flex items-center justify-between gap-space-sm font-label-md text-label-md">
                      <span className="truncate">{survey.title}</span>
                      <span className="flex shrink-0 items-center gap-1">{survey.stats?.completionPercent ?? 0}% <Delta value={deltaOf(responseValues[index] ?? null, responseValues[index + 1] ?? null)} /></span>
                    </div>
                    <BlockMeter percent={survey.stats?.completionPercent ?? 0} filledClass="bg-[#3b6cff]" />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className={`${a.card} rounded-2xl`}>
            <div className="flex items-center justify-between gap-space-sm"><span className="font-title-md text-title-md">CSAT trung bình</span><span className="font-label-md text-label-md text-on-surface-variant">{monthLabel ? `${monthLabel} · ` : ''}mục tiêu {formatNum(CSAT_TARGET)}</span></div>
            {surveyDenied ? <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Khảo sát do bộ phận CSKH theo dõi.</p> : (
              <>
                <div className="mt-space-sm flex items-end gap-space-sm">
                  <div className="text-5xl font-bold tracking-tight">{csatAverage == null ? '—' : formatNum(csatAverage, 2)}</div>
                  <Delta value={csatHeadlineDelta} />
                </div>
                <p className="mb-space-md font-label-md text-label-md text-on-surface-variant">{recentSurveys.length} khảo sát gửi gần nhất{monthLabel ? ` · ${monthLabel.toLowerCase()}` : ''}</p>
                {recentSurveys.map((survey, index) => {
                  const score = csatValues[index]
                  const width = score == null ? 0 : (score / 5) * 100
                  return (
                    <div key={survey.id} className="mb-space-sm">
                      <div className="flex items-center justify-between gap-space-sm font-label-md text-label-md">
                        <span className="truncate">{survey.title}</span>
                        <span className="flex shrink-0 items-center gap-1">{score == null ? '—' : formatNum(score, 2)} <Delta value={deltaOf(score, csatValues[index + 1] ?? null)} /></span>
                      </div>
                      <BlockMeter percent={width} filledClass="bg-[#12a37f]" />
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <div className={`${a.card} rounded-2xl`}>
            <div className="flex items-center justify-between"><span className="font-title-md text-title-md">Chiến dịch đã gửi</span>{link('/admin/chien-dich', 'Chiến dịch →')}</div>
            {campaignDenied ? <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Chiến dịch do bộ phận Kinh doanh theo dõi.</p> : (
              <>
                <div className="mt-space-sm flex items-end gap-space-sm">
                  <div className="text-5xl font-bold tracking-tight">{campaigns ? `${sentDone}/${mailCampaigns.length}` : '…'}</div>
                  {campaigns && mailCampaigns.length > 0 && sentDone === mailCampaigns.length && <span className="mb-2 rounded-full bg-sky-50 px-2 py-0.5 font-label-sm text-label-sm font-semibold text-sky-700">Đã gửi hết</span>}
                </div>
                <p className="mb-space-md font-label-md text-label-md text-on-surface-variant">{allLetters} thư đã phát trên {mailCampaigns.length} chiến dịch</p>
                <div className="grid grid-cols-12 gap-1.5">
                  {Array.from({ length: squares }, (_, index) => (
                    <span key={index} className={`h-4 rounded-[3px] ${index < Math.min(squares, allLetters) ? 'bg-[#3b6cff]' : 'bg-surface-container'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-[#171a1f] p-space-lg text-white lg:col-span-2">
            <div className="font-title-md text-title-md text-white/80">Tỷ lệ mở thư</div>
            {campaignDenied ? <p className="mt-space-md text-white/70">Chiến dịch do bộ phận Kinh doanh theo dõi.</p> : (
              <>
                <div className="mt-space-sm flex items-end gap-space-sm">
                  <div className="text-5xl font-bold tracking-tight">{campaigns ? `${formatNum(recentOpenRate)}%` : '…'}</div>
                  <Delta value={openHeadlineDelta} />
                </div>
                <div className="mb-space-md flex items-center justify-between font-label-md text-label-md text-white/60">
                  <span>{recentRead}/{recentLetterTotal} thư</span>
                  <span>{recentCampaigns.length} thư gửi gần nhất</span>
                </div>
                {recentCampaigns.length === 0 && <p className="text-white/60">{campaigns ? 'Chưa có thư đã gửi.' : 'Đang tải…'}</p>}
                {recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="mb-space-sm">
                    <div className="mb-1 flex items-center justify-between gap-space-sm text-sm">
                      <span className="truncate">{campaign.name}</span>
                      <span>{formatNum(openRateOf(campaign))}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full" style={HATCH_DARK}>
                      <div className="h-full bg-sky-400" style={{ width: `${openRateOf(campaign)}%` }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className={`${a.card} rounded-2xl`}>
            <div className="mb-space-sm flex items-center justify-between"><span className="font-title-md text-title-md">Hồ sơ CRM</span>{link('/admin/crm', 'Đi tới →')}</div>
            {reportDenied ? <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Hồ sơ khách do bộ phận CSKH theo dõi.</p> : (<>
            <div className="mb-space-md grid grid-cols-3 gap-space-sm">
              {[['Khách', report?.totalCustomers ?? '…'], ['Champions', rfm.champions ?? 0], ['At Risk', rfm.at_risk ?? 0]].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-[#f6f1ea] px-space-sm py-space-sm">
                  <div className="font-label-sm text-label-sm text-on-surface-variant">{label}</div>
                  <div className="text-2xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-space-xs">
              {(report?.customers ?? []).slice(0, 4).map((customer) => (
                <li key={customer.customerId} className="rounded-xl bg-surface-container-low px-space-sm py-2">
                  <div className="font-title-md text-title-md">{customer.fullName ?? 'Khách'}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant">{RFM_LABEL[customer.rfmSegment ?? 'other'] ?? customer.rfmSegment} · {customer.totalOrders} đơn</div>
                </li>
              ))}
              {report && report.customers.length === 0 && <li className="font-body-md text-body-md text-on-surface-variant">Chưa có hồ sơ khách.</li>}
            </ul>
            </>)}
          </div>
        </div>
      </section>
    </div>
  )
}
