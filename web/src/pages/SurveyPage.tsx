import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, ButtonLink, Card, EmptyState, Loading, Page, PageHeader, cx, inputClass } from '../components/ui'
import { ApiError } from '../lib/api'
import { fetchSurveySheet, submitSurvey, type SurveySheet } from '../lib/crm'
import { useAuth } from '../state/AuthContext'

const RATING_LABEL = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']
const TEXT_LIMIT = 2000

/** Khách làm khảo sát (p5-27/p5-32). ?order=<id> gắn câu trả lời với đơn (NPS sau giao hàng). */
export default function SurveyPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { token, isAuthenticated, isReady } = useAuth()
  const [sheet, setSheet] = useState<SurveySheet | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [showMissing, setShowMissing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const orderId = params.get('order')

  useEffect(() => {
    if (!token || !id) return
    fetchSurveySheet(token, id, orderId)
      .then((s) => {
        setSheet(s)
        setAnswers(Object.fromEntries(s.answers.map((x) => [x.questionId, x.answerText])))
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không mở được khảo sát'))
  }, [token, id, orderId])

  if (!isReady) return <Page><Loading /></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: `/khao-sat/${id}${orderId ? `?order=${orderId}` : ''}` }} />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !sheet) return
    const missing = sheet.questions.filter((q) => !answers[q.id]?.trim())
    if (missing.length) {
      setShowMissing(true)
      setError(`Còn ${missing.length} câu chưa trả lời.`)
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitSurvey(token, sheet.id, sheet.questions.map((q) => ({ questionId: q.id, answerText: answers[q.id].trim() })), orderId)
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không gửi được câu trả lời')
    } finally {
      setSubmitting(false)
    }
  }

  if (done || sheet?.submitted) {
    return (
      <Page narrow>
        <Card>
          <EmptyState icon="volunteer_activism" title="Cảm ơn bạn đã góp ý!" description="Câu trả lời của bạn giúp Chợ Tốt Mua phục vụ game thủ tốt hơn."
            action={<ButtonLink to="/thong-bao" variant="outline">Về trang thông báo</ButtonLink>} />
        </Card>
      </Page>
    )
  }

  if (sheet && sheet.status !== 'sent') {
    return (
      <Page narrow>
        <Card>
          <EmptyState icon="event_busy" title="Khảo sát đã kết thúc" description="Khảo sát này không còn nhận câu trả lời. Cảm ơn bạn đã quan tâm."
            action={<ButtonLink to="/thong-bao" variant="outline">Về trang thông báo</ButtonLink>} />
        </Card>
      </Page>
    )
  }

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((a) => ({ ...a, [questionId]: value }))
    setError('')
  }
  const answeredCount = sheet?.questions.filter((q) => answers[q.id]?.trim()).length ?? 0

  return (
    <Page narrow>
      <PageHeader breadcrumb={[{ label: 'Thông báo', to: '/thong-bao' }, { label: 'Khảo sát' }]} title={sheet?.title ?? 'Khảo sát'} subtitle={sheet?.description ?? undefined} />
      {orderId && (
        <p className="mb-space-md font-body-md text-body-md text-on-surface-variant">
          Khảo sát cho đơn <Link className="text-primary underline" to={`/don-hang/${orderId}`}>#{orderId.slice(0, 8).toUpperCase()}</Link>
        </p>
      )}
      {error && !sheet && <Alert>{error}</Alert>}
      {!sheet && !error && <Loading />}
      {sheet && (
        <form onSubmit={submit} className="space-y-space-md">
          {sheet.questions.map((q, index) => {
            const isMissing = showMissing && !answers[q.id]?.trim()
            const rating = Number(answers[q.id] ?? 0)
            return (
              <Card key={q.id} id={`q-${q.id}`} className={cx('space-y-space-sm', isMissing && 'ring-2 ring-error')}>
                <p className="font-title-lg text-title-lg text-on-surface break-words">{index + 1}. {q.questionText}</p>
                {q.answerType === 'rating' && (
                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1">
                    <div className="flex gap-1" role="radiogroup" aria-label={q.questionText}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" role="radio" aria-label={`${star} sao, ${RATING_LABEL[star - 1]}`} aria-checked={rating === star} className="text-primary cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => setAnswer(q.id, String(star))}>
                          <span className="material-symbols-outlined text-4xl" style={rating >= star ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                        </button>
                      ))}
                    </div>
                    <span className="font-body-md text-body-md text-on-surface-variant">{rating ? RATING_LABEL[rating - 1] : 'Chọn số sao'}</span>
                  </div>
                )}
                {q.answerType === 'multiple_choice' && (
                  <div className="grid gap-space-xs">
                    {(q.options ?? []).map((opt) => (
                      <label key={opt} className={cx('flex items-center gap-space-sm rounded-lg border px-space-md py-2 cursor-pointer font-body-lg text-body-lg transition-colors',
                        answers[q.id] === opt ? 'border-primary bg-primary-fixed/40' : 'border-line hover:border-primary/60')}>
                        <input type="radio" name={q.id} className="w-4 h-4 shrink-0 accent-primary" checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
                        <span className="min-w-0 break-words">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.answerType === 'text' && (
                  <div>
                    <textarea className={cx(inputClass, 'resize-y')} rows={4} maxLength={TEXT_LIMIT} aria-label={q.questionText} value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder="Chia sẻ cảm nhận của bạn…" />
                    <p className="mt-1 text-right font-label-md text-label-md text-on-surface-variant">{(answers[q.id] ?? '').length}/{TEXT_LIMIT}</p>
                  </div>
                )}
                {isMissing && <p className="font-body-md text-body-md text-error">Câu này chưa được trả lời.</p>}
              </Card>
            )
          })}
          {error && <Alert>{error}</Alert>}
          <p className="text-center font-body-md text-body-md text-on-surface-variant">Đã trả lời {answeredCount}/{sheet.questions.length} câu</p>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi khảo sát'}</Button>
        </form>
      )}
    </Page>
  )
}
