import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import {
  ANSWER_TYPE_LABEL, SURVEY_STATUS_LABEL, addSurveyQuestion, archiveSurvey, publishSurvey, createSurvey, deleteSurvey, deleteSurveyQuestion,
  fetchSegments, fetchSurveyProductTarget, fetchSurveyStats, fetchSurveys, sendSurvey, setSurveyProductTarget, timeVi, updateSurveyQuestion,
  type AnswerType, type Segment, type Survey, type SurveyQuestion, type SurveyStats,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../state/DialogContext'

/** "Auto after delivery" choice → product filter on the survey (OrderDeliveredSurveyDispatcher). */
const AUTO_TARGETS: { value: string; label: string; filter: { productType?: string; publishedOnly: boolean } | null }[] = [
  { value: 'none', label: 'Không tự gửi', filter: null },
  { value: 'all', label: 'Mọi sản phẩm', filter: { publishedOnly: true } },
  { value: 'game_disc', label: 'Đơn có đĩa game', filter: { productType: 'game_disc', publishedOnly: true } },
  { value: 'controller', label: 'Đơn có tay cầm', filter: { productType: 'controller', publishedOnly: true } },
  { value: 'accessory', label: 'Đơn có phụ kiện', filter: { productType: 'accessory', publishedOnly: true } },
]

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'info'> = { draft: 'neutral', sent: 'success', closed: 'info' }

const ANSWER_TYPES: { value: AnswerType; icon: string; hint: string }[] = [
  { value: 'rating', icon: 'star', hint: 'Khách chọn từ 1 đến 5 sao' },
  { value: 'multiple_choice', icon: 'radio_button_checked', hint: 'Khách chọn một đáp án' },
  { value: 'text', icon: 'notes', hint: 'Khách tự nhập nội dung' },
]

type QuestionDraft = { questionText: string; answerType: AnswerType; options: string[] }

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
  const { confirm } = useDialog()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [sendTo, setSendTo] = useState<string[]>([])
  const [auto, setAuto] = useState('none')
  // A target saved as an explicit product list (no filter) — e.g. the seeded post-purchase survey — is still "auto send on".
  const [pickedCount, setPickedCount] = useState(0)
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const isDraft = survey.status === 'draft'

  useEffect(() => {
    fetchSurveyProductTarget(token, survey.id)
      .then((t) => {
        const f = t.filter
        setPickedCount(f ? 0 : t.productIds.length)
        setAuto(f ? (f.productType ? f.productType : 'all') : t.productIds.length > 0 ? 'picked' : 'none')
      })
      .catch(() => setAuto('none'))
    if (survey.status !== 'draft') fetchSurveyStats(token, survey.id).then(setStats).catch(() => setStats(null))
  }, [token, survey.id, survey.status])

  const run = async (fn: () => Promise<unknown>, fallback: string, ok?: string) => {
    onError(''); onNotice('')
    try { await fn(); if (ok) onNotice(ok); onChanged() } catch (e) { onError(e instanceof ApiError ? e.message : fallback) }
  }

  const addQuestion = async (draft: QuestionDraft) => {
    await addSurveyQuestion(token, survey.id, draft)
    onChanged()
  }

  const saveQuestion = async (question: SurveyQuestion, draft: QuestionDraft) => {
    await updateSurveyQuestion(token, survey.id, question.id, { ...draft, sortOrder: question.sortOrder })
    setEditingId(null)
    onChanged()
  }

  const removeQuestion = async (question: SurveyQuestion) => {
    if (!await confirm({ title: 'Xoá câu hỏi', message: <>Xoá câu hỏi <strong>{question.questionText}</strong>?</>, confirmLabel: 'Xoá', tone: 'danger' })) return
    void run(() => deleteSurveyQuestion(token, survey.id, question.id), 'Không xoá được câu hỏi')
  }

  /** Renumbers the questions after a move, so older gaps or ties in sortOrder cannot undo it. */
  const moveQuestion = async (index: number, delta: number) => {
    const list = [...survey.questions]
    const [moved] = list.splice(index, 1)
    list.splice(index + delta, 0, moved)
    setReordering(true)
    await run(async () => {
      try {
        for (const [i, q] of list.entries()) {
          if (q.sortOrder !== i + 1) {
            await updateSurveyQuestion(token, survey.id, q.id, { questionText: q.questionText, answerType: q.answerType, options: q.options ?? [], sortOrder: i + 1 })
          }
        }
      } catch (e) {
        onChanged() // Some questions may already have moved: show what was really saved.
        throw e
      }
    }, 'Không đổi được thứ tự câu hỏi')
    setReordering(false)
  }

  const changeAuto = (value: string) => {
    if (value === 'picked') return
    setAuto(value)
    setPickedCount(0)
    const target = AUTO_TARGETS.find((t) => t.value === value)
    void run(() => setSurveyProductTarget(token, survey.id, target?.filter ?? null), 'Không lưu được cài đặt tự gửi',
      value === 'none' ? 'Đã tắt tự gửi sau giao đơn.'
        : isDraft ? `Đã lưu. Sau khi phát hành, khảo sát sẽ tự gửi khi giao: ${target?.label.toLowerCase()}.`
        : `Khảo sát sẽ tự gửi khi giao: ${target?.label.toLowerCase()}.`)
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
            {isDraft && <button type="button" className={buttonClass('primary', 'sm')} disabled={survey.questions.length === 0 || editingId !== null}
              title={editingId ? 'Lưu hoặc huỷ câu hỏi đang sửa trước khi phát hành' : survey.questions.length === 0 ? 'Thêm ít nhất một câu hỏi trước khi phát hành' : 'Khảo sát sau mua hàng chỉ tự gửi cho khách khi đã phát hành'}
              onClick={() => void run(() => publishSurvey(token, survey.id), 'Không phát hành được', 'Đã phát hành: khảo sát sẽ tự gửi cho các đơn giao xong khớp sản phẩm mục tiêu.')}>Phát hành</button>}
            {survey.status === 'sent' && <button type="button" className={buttonClass('outline', 'sm')} onClick={async () => { if (await confirm({ title: 'Lưu trữ khảo sát', message: <>Lưu trữ <strong>{survey.title}</strong>? Khách sẽ không thể trả lời nữa, khảo sát ngừng tự gửi và <strong>không mở lại được</strong>. Câu trả lời và thống kê vẫn được giữ.</>, confirmLabel: 'Lưu trữ', tone: 'danger' })) void run(() => archiveSurvey(token, survey.id), 'Không lưu trữ được', 'Đã lưu trữ khảo sát.') }}>Lưu trữ</button>}
            {isDraft && <button type="button" className={buttonClass('outline', 'sm')} onClick={async () => { if (await confirm({ title: 'Xoá khảo sát nháp', message: <>Xoá khảo sát <strong>{survey.title}</strong>? Các câu hỏi của nó cũng bị xoá.</>, confirmLabel: 'Xoá', tone: 'danger' })) void deleteSurvey(token, survey.id).then(onDeleted).catch((e) => onError(e instanceof ApiError ? e.message : 'Không xoá được')) }}>Xoá</button>}
          </div>
        </div>

        <ol className="mt-space-md space-y-space-sm">
          {survey.questions.map((q, index) => (
            <li key={q.id} className="rounded-lg border border-line p-space-md">
              {editingId === q.id
                ? <QuestionForm initial={q} submitLabel="Lưu câu hỏi" onSave={(draft) => saveQuestion(q, draft)} onCancel={() => setEditingId(null)} />
                : (
                  <div className="flex items-start gap-space-sm">
                    <span className="font-title-md text-title-md text-on-surface-variant">{index + 1}.</span>
                    <div className="min-w-0 flex-1 space-y-space-xs">
                      <p className="font-title-md text-title-md text-on-surface break-words">{q.questionText}</p>
                      <Badge>{ANSWER_TYPE_LABEL[q.answerType] ?? q.answerType}</Badge>
                      {q.options && q.options.length > 0 && (
                        <ul className="flex flex-wrap gap-space-xs">
                          {q.options.map((o) => <li key={o} className="rounded-md bg-surface-container-low px-space-sm py-0.5 font-body-md text-body-md text-on-surface-variant break-words">{o}</li>)}
                        </ul>
                      )}
                    </div>
                    {isDraft && (
                      <div className="flex shrink-0 items-center gap-1">
                        <IconAction icon="arrow_upward" label="Chuyển lên" disabled={index === 0 || reordering} onClick={() => void moveQuestion(index, -1)} />
                        <IconAction icon="arrow_downward" label="Chuyển xuống" disabled={index === survey.questions.length - 1 || reordering} onClick={() => void moveQuestion(index, 1)} />
                        <IconAction icon="edit" label="Sửa câu hỏi" disabled={reordering} onClick={() => setEditingId(q.id)} />
                        <IconAction icon="delete" label="Xoá câu hỏi" disabled={reordering} onClick={() => void removeQuestion(q)} />
                      </div>
                    )}
                  </div>
                )}
            </li>
          ))}
        </ol>
        {survey.questions.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Chưa có câu hỏi.</p>}

        {isDraft && !editingId && (
          <div className="mt-space-md pt-space-md border-t border-line">
            <QuestionForm submitLabel="+ Thêm câu hỏi" onSave={addQuestion} />
          </div>
        )}
      </div>

      {survey.status !== 'closed' && survey.questions.length > 0 && (
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
              {pickedCount > 0 && <option value="picked">{`Đơn có sản phẩm đã chọn (${pickedCount} sản phẩm)`}</option>}
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

function IconAction({ icon, label, disabled, onClick }: { icon: string; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  )
}

/** Adds or edits one question. Input stays in place until the save succeeds, and adding keeps focus for the next question. */
function QuestionForm({ initial, submitLabel, onSave, onCancel }: {
  initial?: SurveyQuestion
  submitLabel: string
  onSave: (draft: QuestionDraft) => Promise<void>
  onCancel?: () => void
}) {
  const [questionText, setQuestionText] = useState(initial?.questionText ?? '')
  const [answerType, setAnswerType] = useState<AnswerType>(initial?.answerType ?? 'rating')
  const [options, setOptions] = useState<string[]>(initial?.options?.length ? initial.options : ['', ''])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const optionRefs = useRef<(HTMLInputElement | null)[]>([])
  const focusOption = useRef<number | null>(null)

  useEffect(() => {
    if (focusOption.current !== null) {
      optionRefs.current[focusOption.current]?.focus()
      focusOption.current = null
    }
  })

  const seen = new Set<string>()
  const duplicates = options.map((o) => {
    const key = o.trim().toLowerCase()
    if (!key) return false
    if (seen.has(key)) return true
    seen.add(key)
    return false
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = questionText.replace(/\s*\n\s*/g, ' ').trim()
    if (!text) { setError('Hãy nhập nội dung câu hỏi.'); questionRef.current?.focus(); return }
    const isChoice = answerType === 'multiple_choice'
    const filled = options.map((o) => o.trim()).filter(Boolean)
    if (isChoice && filled.length < 2) { setError('Câu hỏi lựa chọn cần ít nhất 2 đáp án.'); return }
    if (isChoice && duplicates.some(Boolean)) { setError('Có đáp án bị trùng, hãy sửa lại trước khi lưu.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ questionText: text, answerType, options: isChoice ? filled : [] })
      if (!initial) {
        setQuestionText('')
        setOptions(['', ''])
        questionRef.current?.focus()
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được câu hỏi')
    } finally {
      setSaving(false)
    }
  }

  const onQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (answerType === 'multiple_choice') optionRefs.current[0]?.focus()
    else formRef.current?.requestSubmit()
  }

  const setOption = (index: number, value: string) => setOptions((list) => list.map((o, i) => (i === index ? value : o)))

  const removeOption = (index: number) => {
    setOptions((list) => (list.length > 2 ? list.filter((_, i) => i !== index) : list.map((o, i) => (i === index ? '' : o))))
    focusOption.current = options.length > 2 ? Math.max(index - 1, 0) : index
  }

  const onOptionKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') {
      event.preventDefault()
      if (index === options.length - 1) {
        focusOption.current = index + 1
        setOptions((list) => [...list, ''])
      } else {
        optionRefs.current[index + 1]?.focus()
      }
    } else if (event.key === 'Backspace' && !options[index] && options.length > 2) {
      event.preventDefault()
      removeOption(index)
    }
  }

  /** Pasting a multi-line list fills one answer per line. */
  const onOptionPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const lines = event.clipboardData.getData('text').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return
    event.preventDefault()
    focusOption.current = index + lines.length - 1
    setOptions((list) => [...list.slice(0, index), ...lines, ...list.slice(index + 1)])
  }

  return (
    <form ref={formRef} className="space-y-space-md" onSubmit={submit} noValidate>
      <div>
        <label htmlFor={`${initial?.id ?? 'new'}-question`} className="mb-1 block font-label-md text-label-md text-on-surface-variant">{initial ? 'Nội dung câu hỏi' : 'Câu hỏi mới'}</label>
        <textarea id={`${initial?.id ?? 'new'}-question`} ref={questionRef} rows={2} className={cx(a.input, 'resize-y')} value={questionText} onChange={(e) => setQuestionText(e.target.value)} onKeyDown={onQuestionKeyDown} placeholder="VD: Bạn hài lòng với tốc độ giao hàng không?" />
      </div>

      <fieldset>
        <legend className="mb-1 font-label-md text-label-md text-on-surface-variant">Kiểu trả lời</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
          {ANSWER_TYPES.map((t) => (
            <label key={t.value} className={cx('flex cursor-pointer items-start gap-space-xs rounded-lg border p-space-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40', answerType === t.value ? 'border-primary bg-primary-fixed/40' : 'border-line hover:border-primary/60')}>
              <input type="radio" name={`${initial?.id ?? 'new'}-type`} className="sr-only" checked={answerType === t.value} onChange={() => setAnswerType(t.value)} />
              <span className="material-symbols-outlined text-[20px] text-primary">{t.icon}</span>
              <span>
                <span className="block font-title-md text-title-md text-on-surface">{ANSWER_TYPE_LABEL[t.value]}</span>
                <span className="block font-label-md text-label-md font-normal text-on-surface-variant">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {answerType === 'multiple_choice' && (
        <fieldset className="space-y-space-xs">
          <legend className="mb-1 font-label-md text-label-md text-on-surface-variant">Đáp án</legend>
          {options.map((option, index) => (
            <div key={index}>
              <div className="flex items-center gap-space-xs">
                <span className="w-6 shrink-0 text-center font-label-md text-label-md text-on-surface-variant">{index + 1}</span>
                <input ref={(el) => { optionRefs.current[index] = el }} aria-label={`Đáp án ${index + 1}`} aria-invalid={duplicates[index]} className={cx(a.input, duplicates[index] && '!border-error')} value={option}
                  onChange={(e) => setOption(index, e.target.value)} onKeyDown={(e) => onOptionKeyDown(e, index)} onPaste={(e) => onOptionPaste(e, index)} placeholder={`Đáp án ${index + 1}`} />
                <IconAction icon="close" label={`Xoá đáp án ${index + 1}`} onClick={() => removeOption(index)} />
              </div>
              {duplicates[index] && <p className="ml-8 mt-0.5 font-label-md text-label-md text-error">Đáp án này bị trùng.</p>}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <button type="button" className={cx(a.linkButton, 'font-label-md text-label-md')} onClick={() => { focusOption.current = options.length; setOptions((list) => [...list, '']) }}>+ Thêm đáp án</button>
            <span className="font-label-md text-label-md font-normal text-on-surface-variant">Enter để thêm dòng. Có thể dán danh sách nhiều dòng.</span>
          </div>
        </fieldset>
      )}

      {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
      <div className={a.formActions}>
        {onCancel && <button type="button" className={buttonClass('outline')} onClick={onCancel}>Huỷ</button>}
        <button type="submit" className={buttonClass(initial ? 'primary' : 'outline')} disabled={saving}>{saving ? 'Đang lưu…' : submitLabel}</button>
      </div>
    </form>
  )
}
