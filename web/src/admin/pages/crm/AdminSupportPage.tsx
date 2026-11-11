import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { a } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import {
  PRIORITY_OPTIONS, SLA_HOURS, escalateConversation, fetchConversation, fetchConversations, fetchSupportAgents, patchConversation, priorityOf, sendConversationMessage, slaLabel, timeVi,
  type ConversationDetail, type ConversationMessage, type ConversationSummary, type Priority, type SupportAgent,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { RecentViews, SearchBox } from '../../components/ListSearch'
import { matches, normalize, useRecentViews } from '../../components/listSearchState'

const FILTERS = [['', 'Tất cả'], ['mine', 'Của tôi'], ['open', 'Chưa xử lý'], ['high', 'Ưu tiên'], ['closed', 'Đã xử lý']] as const

function priorityTone(priority: string): 'danger' | 'info' | 'neutral' {
  if (priority === 'high') return 'danger'
  if (priority === 'low') return 'info'
  return 'neutral'
}

function slaTone(state: string | null | undefined): 'danger' | 'info' | 'success' | 'neutral' {
  if (state === 'breached') return 'danger'
  if (state === 'due') return 'info'
  if (state === 'done') return 'neutral'
  return 'success'
}

/** Còn / trễ so với hạn server đã tính theo mức ưu tiên. */
function remainingText(dueAt: string | null | undefined, state: string | null | undefined) {
  if (state === 'done' || !dueAt) return null
  const diff = new Date(dueAt).getTime() - Date.now()
  if (!Number.isFinite(diff)) return null
  const late = diff < 0
  const minutes = Math.floor(Math.abs(diff) / 60_000)
  if (minutes < 1) return late ? 'vừa quá hạn' : 'còn dưới 1 phút'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const span = hours >= 24
    ? `${Math.floor(hours / 24)} ngày${hours % 24 ? ` ${hours % 24} giờ` : ''}`
    : hours > 0
      ? `${hours} giờ${rest ? ` ${rest} phút` : ''}`
      : `${minutes} phút`
  return late ? `trễ ${span}` : `còn ${span}`
}
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

/** Hàng đợi hỗ trợ CSKH (p5-12→14, p5-17): ticket/chat, trả lời, ghi chú nội bộ, phân công / chuyển nhân viên, đánh dấu đã xử lý. */
export default function AdminSupportPage() {
  const { token } = useAuth()
  const [params, setParams] = useSearchParams()
  const requestedId = params.get('id')
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState<ConversationSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(requestedId)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const viewed = useRecentViews('support')
  const pushViewed = viewed.push

  useEffect(() => {
    setSelectedId(requestedId)
  }, [requestedId])

  const open = useCallback((c: { id: string; code: string; customerName: string | null }) => {
    setParams({ id: c.id })
    pushViewed(c.id, `${c.code} · ${c.customerName ?? 'Khách'}`)
  }, [pushViewed, setParams])

  const shown = useMemo(() => items?.filter((c) => matches(query, c.code, c.customerName, c.preview, c.topicLabel, c.assigneeName, c.statusLabel)) ?? null, [items, query])

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
      <div className={a.toolbar}>
        <h1 className="!mb-0">Hỗ trợ khách hàng</h1>
        <SearchBox page="support" placeholder="Tìm mã ticket, khách, nội dung..." value={query} onChange={setQuery} />
      </div>
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => setParams({ id })} />
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

          {!shown && <p className={a.empty}>Đang tải…</p>}
          {shown?.length === 0 && <p className={a.empty}>{query ? 'Không có hội thoại nào khớp từ khoá.' : 'Không có hội thoại nào.'}</p>}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {shown?.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => open(c)} aria-current={c.id === selectedId ? 'true' : undefined}
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
                      <Badge tone={priorityTone(priorityOf(c.priority))}>{PRIORITY_OPTIONS.find((item) => item.value === priorityOf(c.priority))?.label}</Badge>
                      {(c.slaState === 'breached' || c.slaState === 'due') && <Badge tone={slaTone(c.slaState)}>{slaLabel(c.slaState)}</Badge>}
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
            ? <ConversationPanel key={selectedId} token={token} id={selectedId} onBack={() => setParams({}, { replace: true })} onChanged={loadList} onError={setError} />
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
  const priority = priorityOf(detail.priority)
  const remaining = remainingText(detail.slaDueAt, detail.slaState)
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
              <Badge tone={priorityTone(priority)}>{PRIORITY_OPTIONS.find((item) => item.value === priority)?.label}</Badge>
              <Badge tone={slaTone(detail.slaState)}>{slaLabel(detail.slaState)}{remaining ? ` · ${remaining}` : ''}</Badge>
            </div>
            <p className="font-label-md text-label-md font-normal text-on-surface-variant">{facts.join(' · ')}</p>
          </div>
        </div>

        {customer && (
          <dl className="flex flex-wrap gap-x-space-lg gap-y-0.5 font-label-md text-label-md">
            {customer.tierLabel && <Fact label="Nhóm khách" value={customer.tierLabel} />}
            <Fact label="Đơn hàng" value={String(customer.totalOrders)} />
            {customer.totalSpend != null && <Fact label="Đã chi" value={formatVnd(Number(customer.totalSpend))} />}
            {detail.assigneeName && <Fact label="Phụ trách" value={detail.assigneeName} />}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-space-xs">
          {detail.status === 'open' && <button type="button" className={buttonClass('primary', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { status: 'in_progress' }), 'Không nhận xử lý được')}>Nhận xử lý</button>}
          {!closed && (
            <AgentPicker agents={agents.filter((ag) => ag.userId !== detail.assigneeId)} label={detail.assigneeId ? 'Chuyển cho nhân viên khác' : 'Phân công nhân viên'}
              onPick={(userId) => void apply(() => escalateConversation(token, id, userId), 'Không chuyển được')} />
          )}
          <label className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
            Ưu tiên
            <select
              aria-label="Mức ưu tiên"
              className={cx(buttonClass('outline', 'sm'), 'cursor-pointer')}
              value={priority}
              onChange={(event) => {
                const next = event.target.value as Priority
                if (next === priority) return
                void apply(() => patchConversation(token, id, { priority: next }), 'Không đổi được ưu tiên')
              }}
            >
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label} · {SLA_HOURS[item.value]} giờ</option>
              ))}
            </select>
          </label>
          {detail.slaDueAt && !closed && (
            <span className="font-label-md text-label-md text-on-surface-variant">Hạn {timeVi(detail.slaDueAt)}</span>
          )}
          {!closed && (
            <button type="button" className={cx(buttonClass('primary', 'sm'), 'sm:ml-auto inline-flex items-center gap-1')} title="Cần có người phụ trách và đã trả lời khách"
              onClick={() => void apply(() => patchConversation(token, id, { status: 'closed' }), 'Không chuyển sang đã xử lý được')}>
              <span className="material-symbols-outlined !text-base">task_alt</span>Đánh dấu đã xử lý
            </button>
          )}
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
          Ticket đã xử lý xong. Khách có thể mở yêu cầu mới nếu vẫn cần hỗ trợ.
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

/** Chọn nhân viên CSKH để phân công / chuyển ticket, có ô tìm theo tên. */
function AgentPicker({ agents, label, onPick }: { agents: SupportAgent[]; label: string; onPick: (userId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const list = agents.filter((ag) => !term.trim() || normalize(`${ag.fullName} ${ag.roleLabel}`).includes(normalize(term)))

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (userId: string) => { setOpen(false); setTerm(''); onPick(userId) }

  return (
    <div ref={boxRef} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} className={cx(buttonClass('outline', 'sm'), 'inline-flex items-center gap-1')} onClick={() => setOpen((v) => !v)}>
        <span className="material-symbols-outlined !text-base">person_add</span>{label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-line bg-surface-container-lowest p-space-xs shadow-lg">
          <input autoFocus type="search" aria-label="Tìm nhân viên" placeholder="Tìm nhân viên theo tên…" value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && list.length === 1) pick(list[0].userId) }}
            className={cx(a.input, '!py-1.5 mb-1')} />
          <ul role="listbox" aria-label="Nhân viên CSKH" className="max-h-60 overflow-y-auto">
            {list.length === 0 && <li className="px-2 py-1.5 font-body-md text-body-md text-on-surface-variant">Không có nhân viên phù hợp.</li>}
            {list.map((ag) => (
              <li key={ag.userId}>
                <button type="button" role="option" aria-selected={false} onClick={() => pick(ag.userId)}
                  className="flex w-full cursor-pointer items-center justify-between gap-space-sm rounded-lg px-2 py-1.5 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low">
                  <span className="truncate">{ag.fullName}</span>
                  <span className="flex-shrink-0 font-label-sm text-label-sm text-on-surface-variant">{ag.roleLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
