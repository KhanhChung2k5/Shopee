import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import {
  ANSWER_TYPE_LABEL, SURVEY_STATUS_LABEL, addSurveyQuestion, archiveSurvey, createSurvey, deleteSurvey, deleteSurveyQuestion,
  fetchSegments, fetchSurveyProductTarget, fetchSurveyStats, fetchSurveys, sendSurvey, setSurveyProductTarget, timeVi,
  type AnswerType, type Segment, type Survey, type SurveyStats,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

/** "Auto after delivery" choice → product filter on the survey (OrderDeliveredSurveyDispatcher). */
const AUTO_TARGETS: { value: string; label: string; filter: { productType?: string; publishedOnly: boolean } | null }[] = [
  { value: 'none', label: 'Không tự gửi', filter: null },
  { value: 'all', label: 'Mọi sản phẩm', filter: { publishedOnly: true } },
  { value: 'game_disc', label: 'Đơn có đĩa game', filter: { productType: 'game_disc', publishedOnly: true } },
  { value: 'controller', label: 'Đơn có tay cầm', filter: { productType: 'controller', publishedOnly: true } },
  { value: 'accessory', label: 'Đơn có phụ kiện', filter: { productType: 'accessory', publishedOnly: true } },
]

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'info'> = { draft: 'neutral', sent: 'success', archived: 'info' }

/** Khảo sát khách hàng (p5-23→28, p5-31): tạo, thêm câu hỏi, gửi tới phân khúc, NPS sau giao đơn, thống kê. CS + admin. */
export default function AdminSurveysPage() {
  const { token } = useAuth()
  const [surveys, setSurveys] = useState<Survey[] | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(() => {
    if (!token) return
    fetchSurveys(token)
      .then((d) => { setSurveys(d.surveys); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được khảo sát'))
  }, [token])

  useEffect(load, [load])
  useEffect(() => { if (token) fetchSegments(token).then((d) => setSegments(d.segments)).catch(() => setSegments([])) }, [token])

  const selected = surveys?.find((s) => s.id === selectedId) ?? null

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !title.trim()) return
    try {
      const created = await createSurvey(token, title.trim(), description.trim())
      setTitle(''); setDescription('')
      setSelectedId(created.id)
      load()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không tạo được khảo sát') }
  }

  return (
    <div>
      <h1>Khảo sát khách hàng</h1>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {notice && <p className="font-body-md text-body-md text-secondary mb-space-md">{notice}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-space-md items-start">
        <div className="xl:col-span-2 space-y-space-md">
          <form className={cx(a.formGrid, a.card, '!mb-0')} onSubmit={create}>
            <label className="col-span-full">Tên khảo sát<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đánh giá trải nghiệm giao hàng" /></label>
            <label className="col-span-full">Mô tả<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hiển thị cho khách ở đầu khảo sát" /></label>
            <div className={a.formActions}><button type="submit" className={buttonClass('primary')}>+ Tạo khảo sát</button></div>
          </form>

          <div className={a.tableWrap}>
            <table className={cx(a.table, '!min-w-0')}>
              <thead><tr><th>Khảo sát</th><th>Trạng thái</th><th>Câu hỏi</th></tr></thead>
              <tbody>
                {!surveys && <tr><td colSpan={3} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
                {surveys?.length === 0 && <tr><td colSpan={3} className="text-center !py-space-xl text-on-surface-variant">Chưa có khảo sát nào.</td></tr>}
                {surveys?.map((s) => (
                  <tr key={s.id} className={cx('cursor-pointer', s.id === selectedId && 'is-selected')} onClick={() => setSelectedId(s.id)}>
                    <td><div className="font-semibold">{s.title}</div><div className="font-label-md text-label-md text-on-surface-variant">{timeVi(s.createdAt)}</div></td>
                    <td><Badge tone={STATUS_TONE[s.status] ?? 'neutral'}>{SURVEY_STATUS_LABEL[s.status] ?? s.status}</Badge></td>
                    <td>{s.questions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-3">
          {selected && token
            ? <SurveyEditor key={selected.id} token={token} survey={selected} segments={segments} onChanged={load} onDeleted={() => { setSelectedId(null); load() }} onNotice={setNotice} onError={setError} />
            : <div className={cx(a.card, a.empty)}>Chọn một khảo sát để thêm câu hỏi, gửi cho khách hoặc xem thống kê.</div>}
        </div>
      </div>
    </div>
  )
}

function SurveyEditor({ token, survey, segments, onChanged, onDeleted, onNotice, onError }: {
  token: string
  survey: Survey
  segments: Segment[]
  onChanged: () => void
  onDeleted: () => void
  onNotice: (m: string) => void
  onError: (m: string) => void
}) {
  const [questionText, setQuestionText] = useState('')
  const [answerType, setAnswerType] = useState<AnswerType>('rating')
  const [options, setOptions] = useState('')
  const [sendTo, setSendTo] = useState<string[]>([])
  const [auto, setAuto] = useState('none')
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const isDraft = survey.status === 'draft'

  useEffect(() => {
    fetchSurveyProductTarget(token, survey.id)
      .then((t) => {
        const f = t.filter
        setAuto(!f ? 'none' : f.productType ? f.productType : 'all')
      })
      .catch(() => setAuto('none'))
    if (survey.status !== 'draft') fetchSurveyStats(token, survey.id).then(setStats).catch(() => setStats(null))
  }, [token, survey.id, survey.status])

  const run = async (fn: () => Promise<unknown>, fallback: string, ok?: string) => {
    try { await fn(); if (ok) onNotice(ok); onChanged() } catch (e) { onError(e instanceof ApiError ? e.message : fallback) }
  }

  const addQuestion = (event: FormEvent) => {
    event.preventDefault()
    if (!questionText.trim()) return
    const opts = answerType === 'multiple_choice' ? options.split('\n').map((o) => o.trim()).filter(Boolean) : []
    if (answerType === 'multiple_choice' && opts.length < 2) { onError('Câu hỏi lựa chọn cần ít nhất 2 đáp án (mỗi dòng một đáp án).'); return }
    void run(() => addSurveyQuestion(token, survey.id, { questionText: questionText.trim(), answerType, options: opts }), 'Không thêm được câu hỏi')
    setQuestionText(''); setOptions('')
  }

  const changeAuto = (value: string) => {
    setAuto(value)
    const target = AUTO_TARGETS.find((t) => t.value === value)
    void run(() => setSurveyProductTarget(token, survey.id, target?.filter ?? null), 'Không lưu được cài đặt tự gửi',
      value === 'none' ? 'Đã tắt tự gửi sau giao đơn.' : `Khảo sát sẽ tự gửi khi giao: ${target?.label.toLowerCase()}.`)
  }

  return (
    <div className="space-y-space-md">
      <div className={a.card}>
        <div className="flex flex-wrap items-start justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">{survey.title}</h2>
            {survey.description && <p className="font-body-md text-body-md text-on-surface-variant">{survey.description}</p>}
          </div>
          <div className={a.rowActions}>
            {survey.status === 'sent' && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void run(() => archiveSurvey(token, survey.id), 'Không lưu trữ được', 'Đã lưu trữ khảo sát.')}>Lưu trữ</button>}
            {isDraft && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => { if (confirm('Xoá khảo sát nháp này?')) void deleteSurvey(token, survey.id).then(onDeleted).catch((e) => onError(e instanceof ApiError ? e.message : 'Không xoá được')) }}>Xoá</button>}
          </div>
        </div>

        <ol className="mt-space-md space-y-space-xs list-decimal pl-5">
          {survey.questions.map((q) => (
            <li key={q.id} className="font-body-md text-body-md text-on-surface">
              <span className="font-semibold">{q.questionText}</span>{' '}
              <Badge>{ANSWER_TYPE_LABEL[q.answerType] ?? q.answerType}</Badge>
              {q.options && q.options.length > 0 && <span className="text-on-surface-variant"> — {q.options.join(' / ')}</span>}
              {isDraft && <button type="button" className={cx(a.linkButton, 'ml-space-sm text-label-md')} onClick={() => void run(() => deleteSurveyQuestion(token, survey.id, q.id), 'Không xoá được câu hỏi')}>xoá</button>}
            </li>
          ))}
          {survey.questions.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant -ml-5">Chưa có câu hỏi.</p>}
        </ol>

        {isDraft && (
          <form className={cx(a.formGrid, '!mb-0 mt-space-md pt-space-md border-t border-line')} onSubmit={addQuestion}>
            <label className="col-span-full">Câu hỏi mới<input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="VD: Bạn hài lòng với tốc độ giao hàng không?" /></label>
            <label>Kiểu trả lời
              <select value={answerType} onChange={(e) => setAnswerType(e.target.value as AnswerType)}>
                {(Object.keys(ANSWER_TYPE_LABEL) as AnswerType[]).map((t) => <option key={t} value={t}>{ANSWER_TYPE_LABEL[t]}</option>)}
              </select>
            </label>
            {answerType === 'multiple_choice' && <label>Đáp án (mỗi dòng một đáp án)<textarea rows={3} value={options} onChange={(e) => setOptions(e.target.value)} /></label>}
            <div className={a.formActions}><button type="submit" className={buttonClass('outline')}>+ Thêm câu hỏi</button></div>
          </form>
        )}
      </div>

      {survey.status !== 'archived' && survey.questions.length > 0 && (
        <div className={cx(a.card, 'space-y-space-md')}>
          <h3 className="font-title-lg text-title-lg text-on-surface">Gửi khảo sát</h3>
          <div>
            <p className={a.statLabel}>Gửi ngay tới phân khúc (thông báo in-app)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs mb-space-sm">
              {segments.map((s) => (
                <label key={s.id} className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" checked={sendTo.includes(s.id)} onChange={() => setSendTo((v) => v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id])} />
                  {s.name} <span className="text-on-surface-variant">({s.memberCount})</span>
                </label>
              ))}
            </div>
            <button type="button" className={buttonClass('primary', 'sm')} disabled={sendTo.length === 0}
              onClick={() => void run(async () => { const r = await sendSurvey(token, survey.id, sendTo); setSendTo([]); onNotice(`Đã gửi khảo sát tới ${r.sentCount} khách.`) }, 'Không gửi được khảo sát')}>
              Gửi khảo sát
            </button>
          </div>
          <label className="block">
            <span className={a.statLabel}>Tự gửi sau khi giao đơn (khảo sát NPS)</span>
            <select className={cx(a.input, '!w-auto')} value={auto} onChange={(e) => changeAuto(e.target.value)}>
              {AUTO_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {stats && (
        <div className={cx(a.card, 'space-y-space-md')}>
          <div className="flex flex-wrap gap-space-lg">
            <div><div className={a.statLabel}>Đã mời</div><div className={a.statValue}>{stats.invitedCount}</div></div>
            <div><div className={a.statLabel}>Đã trả lời</div><div className={a.statValue}>{stats.submittedCount}</div></div>
            <div><div className={a.statLabel}>Tỉ lệ hoàn thành</div><div className={`${a.statValue} !text-primary`}>{stats.completionPercent}%</div></div>
          </div>
          {stats.questions.map((q) => (
            <div key={q.questionId} className="space-y-space-xs">
              <p className="font-title-md text-title-md text-on-surface">{q.questionText} <span className="text-on-surface-variant font-normal">({q.answerCount} trả lời)</span></p>
              {q.buckets.length > 0 && q.buckets.map((b) => {
                const pct = q.answerCount ? Math.round((b.count / q.answerCount) * 100) : 0
                return (
                  <div key={b.value} className="grid grid-cols-[140px_1fr_48px] items-center gap-space-sm font-body-md text-body-md">
                    <span className="truncate">{q.answerType === 'rating' ? `${b.value} ★` : b.value}</span>
                    <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    <span className="text-right">{b.count}</span>
                  </div>
                )
              })}
              {q.texts.length > 0 && <ul className="space-y-1">{q.texts.slice(0, 8).map((t, i) => <li key={i} className="rounded-lg bg-surface-container-low px-space-sm py-space-xs font-body-md text-body-md">“{t}”</li>)}</ul>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
