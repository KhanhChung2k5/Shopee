import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { a, chipClass } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import {
  escalateConversation, fetchConversation, fetchConversations, fetchSupportAgents, patchConversation, sendConversationMessage, timeVi,
  type ConversationDetail, type ConversationSummary, type SupportAgent,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

const FILTERS = [['', 'Tất cả'], ['mine', 'Của tôi'], ['open', 'Chưa xử lý'], ['high', 'Ưu tiên cao']] as const
const STATUS_TONE: Record<string, 'primary' | 'info' | 'neutral'> = { open: 'primary', in_progress: 'info', closed: 'neutral' }

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
      <h1>Hỗ trợ khách hàng</h1>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      <div className={`${a.filterBar} mb-space-md`}>
        {FILTERS.map(([value, label]) => <button key={value} type="button" className={chipClass(filter === value)} onClick={() => setFilter(value)}>{label}</button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-md items-start">
        <div className={cx(a.card, 'lg:col-span-2 !p-0 overflow-hidden')}>
          {!items && <p className={a.empty}>Đang tải…</p>}
          {items?.length === 0 && <p className={a.empty}>Không có hội thoại nào.</p>}
          <ul className="divide-y divide-line max-h-[70vh] overflow-y-auto">
            {items?.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelectedId(c.id)}
                  className={cx('w-full text-left px-space-md py-space-sm space-y-0.5 cursor-pointer transition-colors', c.id === selectedId ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low')}>
                  <div className="flex items-center justify-between gap-space-xs">
                    <span className="font-title-md text-title-md text-on-surface truncate">{c.customerName ?? 'Khách hàng'}</span>
                    <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.statusLabel}</Badge>
                  </div>
                  <div className="font-label-md text-label-md text-on-surface-variant flex flex-wrap gap-x-space-sm">
                    <span>{c.code}</span><span>{c.topicLabel}</span><span>{c.channelLabel}</span>
                    {c.priority === 'high' && <span className="text-error font-bold">Ưu tiên cao</span>}
                  </div>
                  {c.preview && <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">{c.preview}</p>}
                  <div className="font-label-sm text-label-sm text-on-surface-variant">{timeVi(c.lastMessageAt)}{c.assigneeName ? ` · ${c.assigneeName}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          {selectedId && token
            ? <ConversationPanel key={selectedId} token={token} id={selectedId} onChanged={loadList} onError={setError} />
            : <div className={cx(a.card, a.empty)}>Chọn một hội thoại để xem và trả lời khách.</div>}
        </div>
      </div>
    </div>
  )
}

function ConversationPanel({ token, id, onChanged, onError }: { token: string; id: string; onChanged: () => void; onError: (m: string) => void }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetchConversation(token, id).then(setDetail).catch((e) => onError(e instanceof ApiError ? e.message : 'Không mở được hội thoại'))
  }, [token, id, onError])

  useEffect(() => {
    load()
    fetchSupportAgents(token).then(setAgents).catch(() => setAgents([]))
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [load, token])

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [detail?.messages.length])

  const apply = async (fn: () => Promise<ConversationDetail>, fallback: string) => {
    try { setDetail(await fn()); onChanged() } catch (e) { onError(e instanceof ApiError ? e.message : fallback) }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    await apply(() => sendConversationMessage(token, id, reply.trim(), internal ? 'internal' : 'public'), 'Không gửi được tin nhắn')
    setReply('')
    setSending(false)
  }

  if (!detail) return <div className={cx(a.card, a.empty)}>Đang tải hội thoại…</div>
  const closed = detail.status === 'closed'

  return (
    <div className={cx(a.card, '!p-0 overflow-hidden flex flex-col max-h-[78vh]')}>
      <header className="px-space-lg py-space-md border-b border-line space-y-space-xs">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">{detail.customerName ?? 'Khách hàng'}</h2>
            <p className="font-label-md text-label-md text-on-surface-variant">{detail.code} · {detail.topicLabel} · mở lúc {timeVi(detail.openedAt)}{detail.orderId ? ` · đơn #${detail.orderId.slice(0, 8).toUpperCase()}` : ''}</p>
          </div>
          <Badge tone={STATUS_TONE[detail.status] ?? 'neutral'}>{detail.statusLabel}</Badge>
        </div>
        {detail.customer && (
          <p className="font-label-md text-label-md text-on-surface-variant">
            {detail.customer.tierLabel && <>Hạng {detail.customer.tierLabel} · </>}{detail.customer.totalOrders} đơn{detail.customer.totalSpend != null && <> · đã chi {formatVnd(Number(detail.customer.totalSpend))}</>}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-space-xs">
          {!closed
            ? <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { status: 'closed' }), 'Không đóng được')}>Đóng hội thoại</button>
            : <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { status: 'in_progress' }), 'Không mở lại được')}>Mở lại</button>}
          <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void apply(() => patchConversation(token, id, { priority: detail.priority === 'high' ? 'normal' : 'high' }), 'Không đổi được ưu tiên')}>
            {detail.priority === 'high' ? 'Bỏ ưu tiên' : 'Đánh dấu ưu tiên'}
          </button>
          <select className={cx(a.input, '!w-auto !py-1')} value="" onChange={(e) => e.target.value && void apply(() => escalateConversation(token, id, e.target.value), 'Không chuyển được')}>
            <option value="">Chuyển cho nhân viên…</option>
            {agents.filter((ag) => ag.userId !== detail.assigneeId).map((ag) => <option key={ag.userId} value={ag.userId}>{ag.fullName} ({ag.roleLabel})</option>)}
          </select>
          {detail.assigneeName && <span className="font-label-md text-label-md text-on-surface-variant">Phụ trách: {detail.assigneeName}</span>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-space-lg py-space-md space-y-space-sm bg-surface-container-low">
        {detail.messages.map((m) => {
          const staffSide = m.side === 'agent' || m.side === 'staff' || m.senderRole === 'staff'
          const note = m.kind === 'internal'
          const system = m.kind === 'system' || m.kind === 'bot' || m.kind === 'csat'
          if (system) return <p key={m.id} className="text-center font-label-md text-label-md text-on-surface-variant">{m.content}{m.score != null ? ` (${m.score}/5)` : ''}</p>
          return (
            <div key={m.id} className={cx('flex', staffSide ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[80%] rounded-xl px-space-md py-space-sm font-body-md text-body-md',
                note ? 'bg-tertiary-fixed text-on-tertiary-fixed border border-dashed border-tertiary' : staffSide ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface shadow-sm')}>
                <div className="font-label-sm text-label-sm opacity-80 mb-0.5">{note ? 'Ghi chú nội bộ · ' : ''}{m.senderName ?? ''} · {timeVi(m.sentAt)}</div>
                <p className="whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!closed && (
        <form className="border-t border-line p-space-md space-y-space-xs" onSubmit={send}>
          <textarea className={a.input} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={internal ? 'Ghi chú chỉ nhân viên thấy…' : 'Trả lời khách hàng…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e) } }} />
          <div className="flex items-center justify-between gap-space-sm">
            <label className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Ghi chú nội bộ
            </label>
            <button type="submit" className={buttonClass('primary')} disabled={sending || !reply.trim()}>{sending ? 'Đang gửi…' : 'Gửi'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
