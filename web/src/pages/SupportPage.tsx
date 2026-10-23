import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardTitle, EmptyState, Field, Loading, Page, PageHeader, cx, inputClass } from '../components/ui'
import { ApiError } from '../lib/api'
import {
  TOPIC_OPTIONS, fetchConversation, fetchConversations, openConversation, rateConversation, sendConversationMessage, timeVi,
  type ConversationDetail, type ConversationSummary,
} from '../lib/crm'
import { useAuth } from '../state/AuthContext'

/** Trang hỗ trợ của khách (p5-17/p5-18): mở ticket, chat với CSKH, chấm điểm CSAT. ?order=<id> gắn sẵn đơn hàng. */
export default function SupportPage() {
  const { token, isAuthenticated, isReady, user } = useAuth()
  const [params] = useSearchParams()
  const [items, setItems] = useState<ConversationSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(Boolean(params.get('order')))
  const [error, setError] = useState('')

  const loadList = useCallback(() => {
    if (!token) return
    fetchConversations(token)
      .then((d) => { setItems(d.items); if (!selectedId && d.items[0] && !params.get('order')) setSelectedId(d.items[0].id) })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được yêu cầu hỗ trợ'))
  }, [token, selectedId, params])

  useEffect(loadList, [loadList])

  if (!isReady) return <Page><Loading /></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: '/ho-tro' }} />
  if (user?.role === 'staff') return <Navigate to="/admin/ho-tro" replace />

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Tài khoản', to: '/ho-so' }, { label: 'Hỗ trợ' }]}
        title="Trung tâm hỗ trợ"
        subtitle="Gửi câu hỏi về đơn hàng, bảo hành hoặc nhờ tư vấn — CSKH Chợ Tốt Mua sẽ trả lời bạn tại đây."
        actions={<Button icon="add" onClick={() => { setCreating(true); setSelectedId(null) }}>Gửi yêu cầu mới</Button>}
      />
      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <Card className="lg:col-span-4 !p-0 overflow-hidden">
          {!items && <Loading />}
          {items?.length === 0 && <p className="p-space-lg font-body-md text-body-md text-on-surface-variant">Bạn chưa có yêu cầu hỗ trợ nào.</p>}
          <ul className="divide-y divide-line">
            {items?.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => { setSelectedId(c.id); setCreating(false) }}
                  className={cx('w-full text-left px-space-md py-space-sm space-y-0.5 cursor-pointer transition-colors', c.id === selectedId && !creating ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low')}>
                  <div className="flex items-center justify-between gap-space-xs">
                    <span className="font-title-md text-title-md text-on-surface">{c.topicLabel}</span>
                    <Badge tone={c.status === 'closed' ? 'neutral' : 'info'}>{c.statusLabel}</Badge>
                  </div>
                  {c.preview && <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">{c.preview}</p>}
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{c.code} · {timeVi(c.lastMessageAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="lg:col-span-8">
          {creating && token
            ? <NewRequestForm token={token} orderId={params.get('order')} onCreated={(d) => { setCreating(false); setSelectedId(d.id); loadList() }} onError={setError} />
            : selectedId && token
              ? <Thread key={selectedId} token={token} id={selectedId} onChanged={loadList} onError={setError} />
              : <Card><EmptyState icon="support_agent" title="Chúng tôi luôn sẵn sàng hỗ trợ" description="Chọn một yêu cầu bên trái hoặc gửi yêu cầu mới." /></Card>}
        </div>
      </div>
    </Page>
  )
}

function NewRequestForm({ token, orderId, onCreated, onError }: { token: string; orderId: string | null; onCreated: (d: ConversationDetail) => void; onError: (m: string) => void }) {
  const [topic, setTopic] = useState(orderId ? 'hoi_don' : 'tu_van')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) return
    setSending(true)
    try {
      onCreated(await openConversation(token, { type: 'ticket', topic, content: content.trim(), orderId }))
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Không gửi được yêu cầu')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card as="form" onSubmit={submit} className="space-y-space-md">
      <CardTitle icon="edit_note">Yêu cầu hỗ trợ mới</CardTitle>
      {orderId && <Alert tone="info">Yêu cầu sẽ gắn với đơn #{orderId.slice(0, 8).toUpperCase()}.</Alert>}
      <Field label="Chủ đề">
        <select className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)}>
          {TOPIC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Nội dung">
        <textarea className={inputClass} rows={5} required maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mô tả vấn đề bạn gặp phải…" />
      </Field>
      <Button type="submit" icon="send" disabled={sending || !content.trim()}>{sending ? 'Đang gửi…' : 'Gửi yêu cầu'}</Button>
    </Card>
  )
}

function Thread({ token, id, onChanged, onError }: { token: string; id: string; onChanged: () => void; onError: (m: string) => void }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetchConversation(token, id).then(setDetail).catch((e) => onError(e instanceof ApiError ? e.message : 'Không mở được hội thoại'))
  }, [token, id, onError])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [detail?.messages.length])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try { setDetail(await sendConversationMessage(token, id, reply.trim())); setReply(''); onChanged() }
    catch (e) { onError(e instanceof ApiError ? e.message : 'Không gửi được tin nhắn') }
    finally { setSending(false) }
  }

  const rate = async (score: number) => {
    try { setDetail(await rateConversation(token, id, score)) } catch (e) { onError(e instanceof ApiError ? e.message : 'Không gửi được đánh giá') }
  }

  if (!detail) return <Card><Loading /></Card>
  const closed = detail.status === 'closed'

  return (
    <Card className="!p-0 overflow-hidden flex flex-col max-h-[75vh]">
      <header className="px-space-lg py-space-md border-b border-line flex flex-wrap items-center justify-between gap-space-sm">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{detail.topicLabel}</h2>
          <p className="font-label-md text-label-md text-on-surface-variant">{detail.code} · {timeVi(detail.openedAt)}{detail.assigneeName ? ` · CSKH: ${detail.assigneeName}` : ''}</p>
        </div>
        <Badge tone={closed ? 'neutral' : 'info'}>{detail.statusLabel}</Badge>
      </header>

      <div className="flex-1 overflow-y-auto px-space-lg py-space-md space-y-space-sm bg-surface-container-low">
        {detail.messages.filter((m) => m.kind !== 'internal').map((m) => {
          if (m.kind === 'system' || m.kind === 'csat') return <p key={m.id} className="text-center font-label-md text-label-md text-on-surface-variant">{m.content}</p>
          const mine = m.side === 'customer'
          return (
            <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[80%] rounded-xl px-space-md py-space-sm font-body-md text-body-md', mine ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface shadow-sm')}>
                {!mine && <div className="font-label-sm text-label-sm opacity-80 mb-0.5">{m.kind === 'bot' ? 'Trợ lý tự động' : m.senderName ?? 'CSKH'}</div>}
                <p className="whitespace-pre-line">{m.content}</p>
                <div className="font-label-sm text-label-sm opacity-70 mt-0.5 text-right">{timeVi(m.sentAt)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <div className="border-t border-line p-space-md text-center space-y-space-xs">
          {detail.csatScore != null
            ? <p className="font-body-md text-body-md text-on-surface-variant">Bạn đã đánh giá {detail.csatScore}/5. Cảm ơn bạn!</p>
            : <>
                <p className="font-title-md text-title-md text-on-surface">Bạn hài lòng với hỗ trợ lần này chứ?</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" aria-label={`${s} sao`} className="text-primary cursor-pointer hover:scale-110 transition-transform" onClick={() => void rate(s)}>
                      <span className="material-symbols-outlined text-3xl">star</span>
                    </button>
                  ))}
                </div>
              </>}
        </div>
      ) : (
        <form className="border-t border-line p-space-md flex items-end gap-space-sm" onSubmit={send}>
          <textarea className={cx(inputClass, 'flex-1')} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Nhập tin nhắn…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e) } }} />
          <Button type="submit" icon="send" disabled={sending || !reply.trim()}>Gửi</Button>
        </form>
      )}
    </Card>
  )
}
