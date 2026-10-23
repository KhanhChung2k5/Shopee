import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, ButtonLink, Card, EmptyState, Loading, Page, PageHeader, cx, inputClass } from '../components/ui'
import { ApiError } from '../lib/api'
import { fetchSurveySheet, submitSurvey, type SurveySheet } from '../lib/crm'
import { useAuth } from '../state/AuthContext'

/** Khách làm khảo sát (p5-27/p5-32). ?order=<id> gắn câu trả lời với đơn (NPS sau giao hàng). */
export default function SurveyPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { token, isAuthenticated, isReady } = useAuth()
  const [sheet, setSheet] = useState<SurveySheet | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    fetchSurveySheet(token, id)
      .then((s) => {
        setSheet(s)
        setAnswers(Object.fromEntries(s.answers.map((x) => [x.questionId, x.answerText])))
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không mở được khảo sát'))
  }, [token, id])

  if (!isReady) return <Page><Loading /></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: `/khao-sat/${id}` }} />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !sheet) return
    const missing = sheet.questions.filter((q) => !answers[q.id]?.trim())
    if (missing.length) { setError(`Vui lòng trả lời ${missing.length} câu hỏi còn trống.`); return }
    setSubmitting(true)
    setError('')
    try {
      await submitSurvey(token, sheet.id, sheet.questions.map((q) => ({ questionId: q.id, answerText: answers[q.id].trim() })), params.get('order'))
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

  return (
    <Page narrow>
      <PageHeader breadcrumb={[{ label: 'Thông báo', to: '/thong-bao' }, { label: 'Khảo sát' }]} title={sheet?.title ?? 'Khảo sát'} subtitle={sheet?.description ?? undefined} />
      {error && <Alert>{error}</Alert>}
      {!sheet && !error && <Loading />}
      {sheet && (
        <form onSubmit={submit} className="space-y-space-md">
          {sheet.questions.map((q, index) => (
            <Card key={q.id} className="space-y-space-sm">
              <p className="font-title-lg text-title-lg text-on-surface">{index + 1}. {q.questionText}</p>
              {q.answerType === 'rating' && (
                <div className="flex gap-1" role="radiogroup" aria-label={q.questionText}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const on = Number(answers[q.id] ?? 0) >= star
                    return (
                      <button key={star} type="button" aria-label={`${star} sao`} aria-pressed={on} className="text-primary cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(star) }))}>
                        <span className="material-symbols-outlined text-4xl" style={on ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {q.answerType === 'multiple_choice' && (
                <div className="grid gap-space-xs">
                  {(q.options ?? []).map((opt) => (
                    <label key={opt} className={cx('flex items-center gap-space-sm rounded-lg border px-space-md py-2 cursor-pointer font-body-lg text-body-lg transition-colors',
                      answers[q.id] === opt ? 'border-primary bg-primary-fixed/40' : 'border-line hover:border-primary/60')}>
                      <input type="radio" name={q.id} className="w-4 h-4 accent-primary" checked={answers[q.id] === opt} onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.answerType === 'text' && (
                <textarea className={inputClass} rows={3} maxLength={2000} value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="Chia sẻ cảm nhận của bạn…" />
              )}
            </Card>
          ))}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi khảo sát'}</Button>
        </form>
      )}
    </Page>
  )
}
