import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import {
  RFM_LABEL, escalateConversation, fetchConversation, fetchConversations, fetchSupportAgents, patchConversation, sendConversationMessage,
  type ConversationDetail, type ConversationMessage, type ConversationSummary, type SupportAgent,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

const FILTERS = [['', 'Tất cả'], ['mine', 'Của tôi'], ['open', 'Chưa xử lý'], ['high', 'Ưu tiên']] as const
const STATUS_TONE: Record<string, 'primary' | 'info' | 'neutral'> = { open: 'primary', in_progress: 'info', closed: 'neutral' }
const AVATAR_TONES = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-surface-container-high text-on-surface',
]

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** List rows: the time today, the date otherwise. */
function shortTime(iso: string) {
  const date = new Date(iso)
  return sameDay(date, new Date())
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

function dayLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  if (sameDay(date, now)) return 'Hôm nay'
  if (sameDay(date, new Date(now.getTime() - 86_400_000))) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Avatar({ name, seed, size = 'md' }: { name: string | null; seed: string; size?: 'sm' | 'md' }) {
  const words = (name ?? 'K').trim().split(/\s+/)
  const tone = AVATAR_TONES[[...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TONES.length]
  return (
    <span aria-hidden="true" className={cx('flex flex-shrink-0 items-center justify-center rounded-[50%] font-title-md text-title-md', tone, size === 'md' ? 'h-10 w-10' : 'h-7 w-7 !text-label-sm')}>
      {words[words.length - 1].charAt(0).toUpperCase()}
    </span>
  )
}

/** Hàng đợi hỗ trợ CSKH (p5-12→14, p5-17): ticket/chat, trả lời, ghi chú nội bộ, escalate. CS + admin. */
export default function AdminSupportPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState<ConversationSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadList = useCallback(() => {
    if (!token) return
    fetchConversations(token, filter || undefined)
      .then((d) => { setItems(d.items); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được hàng đợi hỗ trợ'))
  }, [token, filter])

  useEffect(() => {
    loadList()
    const timer = window.setInterval(loadList, 15000)
    return () => window.clearInterval(timer)
  }, [loadList])

  return (
    <div>
      <h1 className="!mb-space-md">Hỗ trợ khách hàng</h1>
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-sm">{error}</p>}

      <div className="grid h-[calc(100dvh-15.5rem)] min-h-[520px] lg:h-[calc(100dvh-10rem)] grid-cols-1 overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <section aria-label="Danh sách hội thoại" className={cx('min-h-0 flex-col border-line lg:flex lg:border-r', selectedId ? 'hidden' : 'flex')}>
          <div role="tablist" aria-label="Lọc hội thoại" className="flex flex-shrink-0 gap-space-md overflow-x-auto border-b border-line px-space-md">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}
                className={cx('-mb-px cursor-pointer whitespace-nowrap border-b-2 py-space-sm font-title-md text-title-md transition-colors',
                  filter === value ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface')}>
                {label}
              </button>
            ))}
          </div>

          {!items && <p className={a.empty}>Đang tải…</p>}
          {items?.length === 0 && <p className={a.empty}>Không có hội thoại nào.</p>}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {items?.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelectedId(c.id)} aria-current={c.id === selectedId ? 'true' : undefined}
                  className={cx('flex w-full cursor-pointer gap-space-sm border-l-[3px] px-space-md py-space-sm text-left transition-colors',
                    c.id === selectedId ? 'border-primary bg-primary-fixed/40' : 'border-transparent hover:bg-surface-container-low')}>
                  <Avatar name={c.customerName} seed={c.userId} />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-baseline justify-between gap-space-xs">
                      <span className="truncate font-title-md text-title-md text-on-surface">{c.customerName ?? 'Khách hàng'}</span>
                      <span className="flex-shrink-0 font-label-sm text-label-sm text-on-surface-variant">{shortTime(c.lastMessageAt)}</span>
                    </span>
                    {c.preview && <span className="block truncate font-body-md text-body-md text-on-surface-variant">{c.preview}</span>}
                    <span className="flex flex-wrap items-center gap-x-space-xs gap-y-1 pt-0.5">
                      <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.statusLabel}</Badge>
                      {c.priority === 'high' && <Badge tone="danger">Ưu tiên</Badge>}
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{c.topicLabel}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Hội thoại" className={cx('min-h-0 min-w-0', !selectedId && 'hidden lg:block')}>
          {selectedId && token
            ? <ConversationPanel key={selectedId} token={token} id={selectedId} onBack={() => setSelectedId(null)} onChanged={loadList} onError={setError} />
            : (
              <div className="flex h-full flex-col items-center justify-center gap-space-xs bg-surface-container-low p-space-lg text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">forum</span>
                <p className="font-title-md text-title-md text-on-surface">Chọn một hội thoại</p>
                <p className="font-body-md text-body-md text-on-surface-variant">Nội dung trao đổi với khách sẽ hiện ở đây.</p>
              </div>
            )}
        </section>
      </div>
    </div>
  )
}

function ConversationPanel({ token, id, onBack, onChanged, onError }: {
  token: string
  id: string
  onBack: () => void
  onChanged: () => void
  onError: (m: string) => void
}) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetchConversation(token, id).then(setDetail).catch((e) => onError(e instanceof ApiError ? e.message : 'Không mở được hội thoại'))
  }, [token, id, onError])

  useEffect(() => {
    load()
    fetchSupportAgents(token).then(setAgents).catch(() => setAgents([]))
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [load, token])

  useEffect(() => {
    const box = messagesRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [detail?.messages.length])

  const apply = async (fn: () => Promise<ConversationDetail>, fallback: string) => {
    onError('')
    try {
      setDetail(await fn())
      onChanged()
      return true
    } catch (e) {
      onError(e instanceof ApiError ? e.message : fallback)
      return false
    }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!reply.trim() || sending) return
    setSending(true)
    // A message that failed to send stays in the box so it can be sent again.
    if (await apply(() => sendConversationMessage(token, id, reply.trim(), internal ? 'internal' : 'public'), 'Không gửi được tin nhắn')) setReply('')
    setSending(false)
  }

  const onReplyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) void send(event)
  }

  if (!detail) return <div className={cx(a.empty, 'h-full justify-center')}>Đang tải hội thoại…</div>
  const closed = detail.status === 'closed'
  const high = detail.priority === 'high'
  const customer = detail.customer
  const facts = [
    detail.code,
    detail.topicLabel,
    detail.channelLabel,
    detail.orderId ? `Đơn #${detail.orderId.slice(0, 8).toUpperCase()}` : null,
  ].filter(Boolean)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex-shrink-0 space-y-space-sm border-b border-line px-space-md py-space-sm lg:px-space-lg">
        <div className="flex items-start gap-space-sm">
          <button type="button" aria-label="Về danh sách hội thoại" onClick={onBack} className="flex h-10 w-8 flex-shrink-0 cursor-pointer items-center justify-center text-on-surface-variant lg:hidden">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <Avatar name={detail.customerName} seed={detail.userId} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-space-sm gap-y-0.5">
              <h2 className="truncate font-title-lg text-title-lg text-on-surface">{detail.customerName ?? 'Khách hàng'}</h2>
              <Badge tone={STATUS_TONE[detail.status] ?? 'neutral'}>{detail.statusLabel}</Badge>
              {high && <Badge tone="danger">Ưu tiên</Badge>}
            </div>
            <p className="font-label-md text-label-md font-normal text-on-surface-variant">{facts.join(' · ')}</p>
          </div>
        </div>

        {customer && (
          <dl className="flex flex-wrap gap-x-space-lg gap-y-0.5 font-label-md text-label-md">
            {customer.tierLabel && <Fact label="Nhóm khách" value={customer.tierLabel === 'Other' ? 'Chưa phân nhóm' : RFM_LABEL[customer.tierLabel] ?? customer.tierLabel} />}
            <Fact label="Đơn hàng" value={String(customer.totalOrders)} />
            {customer.totalSpend != null && <Fact label="Đã chi" value={formatVnd(Number(customer.totalSpend))} />}
            {detail.assigneeName && <Fact label="Phụ trách" value={detail.assigneeName} />}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-space-xs">
          {detail.status === 'open' && <button type="button" className={buttonClass('primary', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { status: 'in_progress' }), 'Không nhận xử lý được')}>Nhận xử lý</button>}
          {!closed && (
            <select aria-label="Chuyển cho nhân viên" className={cx(a.input, '!w-auto !py-1 !font-label-md !text-label-md')} value="" onChange={(e) => e.target.value && void apply(() => escalateConversation(token, id, e.target.value), 'Không chuyển được')}>
              <option value="">Chuyển cho nhân viên…</option>
              {agents.filter((ag) => ag.userId !== detail.assigneeId).map((ag) => <option key={ag.userId} value={ag.userId}>{ag.fullName} ({ag.roleLabel})</option>)}
            </select>
          )}
          <button type="button" aria-pressed={high} className={buttonClass('outline', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { priority: high ? 'normal' : 'high' }), 'Không đổi được ưu tiên')}>
            {high ? 'Bỏ ưu tiên' : 'Đánh dấu ưu tiên'}
          </button>
          {!closed && <button type="button" className={cx(buttonClass('outline', 'sm'), 'sm:ml-auto')} title="Cần có người phụ trách và đã trả lời khách" onClick={() => void apply(() => patchConversation(token, id, { status: 'closed' }), 'Không đóng được')}>Đóng hội thoại</button>}
        </div>
      </header>

      <div ref={messagesRef} className="min-h-0 flex-1 space-y-space-sm overflow-y-auto bg-surface-container-low px-space-md py-space-md lg:px-space-lg">
        {detail.messages.map((m, index) => {
          const previous = detail.messages[index - 1]
          const newDay = !previous || !sameDay(new Date(previous.sentAt), new Date(m.sentAt))
          return (
            <div key={m.id} className="space-y-space-sm">
              {newDay && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-surface-container-lowest px-space-sm py-0.5 font-label-sm text-label-sm text-on-surface-variant shadow-sm">{dayLabel(m.sentAt)}</span>
                </div>
              )}
              <MessageRow message={m} customerSeed={detail.userId} />
            </div>
          )
        })}
      </div>

      {closed ? (
        <p className="flex-shrink-0 border-t border-line px-space-lg py-space-md text-center font-body-md text-body-md text-on-surface-variant">
          Hội thoại đã đóng. Khách có thể mở yêu cầu mới nếu vẫn cần hỗ trợ.
        </p>
      ) : (
        <form className={cx('flex-shrink-0 space-y-space-xs border-t border-line px-space-md py-space-sm transition-colors lg:px-space-lg', internal && 'bg-tertiary-fixed/40')} onSubmit={send}>
          <div role="group" aria-label="Loại tin nhắn" className="flex gap-space-md">
            {[[false, 'Trả lời khách'], [true, 'Ghi chú nội bộ']].map(([value, label]) => (
              <button key={String(value)} type="button" aria-pressed={internal === value} onClick={() => setInternal(value as boolean)}
                className={cx('cursor-pointer border-b-2 pb-0.5 font-label-md text-label-md transition-colors', internal === value ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface')}>
                {label}
              </button>
            ))}
          </div>
          <textarea aria-label={internal ? 'Ghi chú nội bộ' : 'Trả lời khách hàng'} className={cx(a.input, 'resize-none')} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={onReplyKeyDown}
            placeholder={internal ? 'Ghi chú chỉ nhân viên thấy, khách không đọc được…' : 'Nhập câu trả lời cho khách…'} />
          <div className="flex items-center justify-between gap-space-sm">
            <span className="hidden font-label-sm text-label-sm text-on-surface-variant sm:inline">Enter để gửi, Shift + Enter để xuống dòng</span>
            <button type="submit" className={cx(buttonClass('primary', 'sm'), 'ml-auto')} disabled={sending || !reply.trim()}>
              {sending ? 'Đang gửi…' : internal ? 'Lưu ghi chú' : 'Gửi'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="font-normal text-on-surface-variant">{label}:</dt>
      <dd className="text-on-surface">{value}</dd>
    </div>
  )
}

function MessageRow({ message: m, customerSeed }: { message: ConversationMessage; customerSeed: string }) {
  const staffSide = m.side === 'agent' || m.side === 'staff' || m.senderRole === 'staff'
  const note = m.kind === 'internal'
  if (m.kind === 'system' || m.kind === 'bot' || m.kind === 'csat') {
    return <p className="mx-auto max-w-[85%] text-center font-label-md text-label-md font-normal text-on-surface-variant">{m.content}{m.score != null ? ` (${m.score}/5)` : ''}</p>
  }
  return (
    <div className={cx('flex items-end gap-space-xs', staffSide && 'justify-end')}>
      {!staffSide && <Avatar name={m.senderName} seed={customerSeed} size="sm" />}
      <div className={cx('flex min-w-0 max-w-[80%] flex-col gap-0.5 lg:max-w-[70%]', staffSide && 'items-end')}>
        <span className="flex items-center gap-1 px-1 font-label-sm text-label-sm text-on-surface-variant">
          {note && <span className="material-symbols-outlined text-sm">lock</span>}
          {note ? 'Ghi chú nội bộ · ' : ''}{m.senderName ?? ''} · {clockTime(m.sentAt)}
        </span>
        <p className={cx('whitespace-pre-line break-words rounded-2xl px-space-md py-space-xs font-body-md text-body-md',
          note ? 'border border-dashed border-tertiary bg-tertiary-fixed text-on-tertiary-fixed'
            : staffSide ? 'rounded-br-md bg-primary text-on-primary'
              : 'rounded-bl-md bg-surface-container-lowest text-on-surface shadow-sm')}>
          {m.content}
        </p>
      </div>
    </div>
  )
}
