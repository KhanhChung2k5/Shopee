import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import {
  createCampaign, deleteCampaign, fetchCampaignFunnel, fetchCampaigns, fetchSegments, sendDraftCampaign, timeVi, updateCampaign,
  type Campaign, type CampaignFunnel, type Segment,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../state/DialogContext'
import { RecentViews, SearchBox, StatusFilter } from '../../components/ListSearch'
import { matches, useRecentViews } from '../../components/listSearchState'

type Delivery = 'draft' | 'scheduled' | 'sent'
type Filter = 'all' | Delivery
type SaveMode = 'draft' | 'send' | 'save'

const FILTERS = [['all', 'Tất cả'], ['draft', 'Bản nháp'], ['scheduled', 'Đã lên lịch'], ['sent', 'Đã gửi']] as const
const DELIVERY_LABEL: Record<Delivery, string> = { draft: 'Bản nháp', scheduled: 'Đã lên lịch', sent: 'Đã gửi' }
const DELIVERY_TONE: Record<Delivery, 'neutral' | 'info' | 'success'> = { draft: 'neutral', scheduled: 'info', sent: 'success' }
const SKIPPED_STATUS: Record<string, string> = { locked: 'Đã khóa', deleted: 'Đã xóa', active: 'Đang hoạt động' }

const deliveryOf = (c: Campaign): Delivery => (c.deliveryStatus === 'draft' || c.deliveryStatus === 'scheduled' ? c.deliveryStatus : 'sent')

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

function scheduleLabel(c: Campaign) {
  if (c.startAt) return timeVi(c.startAt)
  return deliveryOf(c) === 'draft' ? 'Gửi ngay khi bấm gửi' : '—'
}

function outcomeMessage(before: Delivery, result: Campaign, mode: SaveMode) {
  const delivery = deliveryOf(result)
  if (mode === 'draft' || delivery === 'draft') return `Đã lưu nháp "${result.name}". Chưa gửi cho khách nào.`
  if (before === 'sent') return `Đã cập nhật "${result.name}". Thư trong hộp thư đã đổi theo.`
  if (delivery === 'scheduled') {
    return mode === 'save'
      ? `Đã lưu "${result.name}", gửi lúc ${timeVi(result.startAt)}.`
      : `Đã lên lịch "${result.name}" gửi lúc ${timeVi(result.startAt)}.`
  }
  const skipped = result.skipped.length
  return `Đã gửi "${result.name}" tới ${result.sentCount} khách${skipped ? `, bỏ qua ${skipped} khách không còn hoạt động` : ''}.`
}

const fieldClass = 'flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant'
const controlClass = 'w-full rounded-lg border border-line bg-surface-container-lowest px-space-sm py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function SegmentBadges({ ids, nameOf }: { ids: string[]; nameOf: (id: string) => string }) {
  if (ids.length === 0) return <span className="text-on-surface-variant">Chưa chọn</span>
  return <div className="flex flex-wrap gap-1">{ids.map((id) => <Badge key={id}>{nameOf(id)}</Badge>)}</div>
}

function SegmentPicker({ segments, selectedIds, onChange, disabled, lockedHint, className }: {
  segments: Segment[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  lockedHint?: string
  className?: string
}) {
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])
  return (
    <fieldset disabled={disabled} className={`${className ?? ''} ${disabled ? 'opacity-60' : ''}`}>
      <legend className="font-label-md text-label-md text-on-surface-variant mb-1">
        Gửi tới phân khúc{lockedHint ? ` (${lockedHint})` : ''}
      </legend>
      {segments.length === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Chưa có phân khúc — tạo ở mục Phân khúc trước.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
          {segments.map((s) => (
            <label key={s.id} className="!flex !flex-row items-center gap-space-xs font-body-md text-body-md !text-on-surface cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={selectedIds.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.name} <span className="text-on-surface-variant">({s.memberCount} khách)</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={a.card}>
      <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">{title}</h3>
      {children}
    </section>
  )
}

function CampaignDetailPanel({ campaign, segments, token, flash, onClose, onCommitted, onDeleted }: {
  campaign: Campaign
  segments: Segment[]
  token: string
  flash: string
  onClose: () => void
  onCommitted: (previousId: string, next: Campaign, message: string) => void
  onDeleted: (campaign: Campaign) => void
}) {
  const { confirm } = useDialog()
  const closeRef = useRef<HTMLButtonElement>(null)
  const delivery = deliveryOf(campaign)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(campaign.name)
  const [content, setContent] = useState(campaign.content ?? '')
  const [segmentIds, setSegmentIds] = useState(campaign.segmentIds)
  const [scheduleAt, setScheduleAt] = useState(delivery === 'sent' ? '' : toLocalInput(campaign.startAt))
  const [minSchedule, setMinSchedule] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [funnel, setFunnel] = useState<CampaignFunnel | 'error' | null>(null)
  const [funnelAttempt, setFunnelAttempt] = useState(0)

  const segmentName = (id: string) => segments.find((s) => s.id === id)?.name ?? id.slice(0, 8)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelectorAll('[role="dialog"]').length > 1) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (delivery !== 'sent') return
    let cancelled = false
    fetchCampaignFunnel(token, campaign.id)
      .then((data) => { if (!cancelled) setFunnel(data) })
      .catch(() => { if (!cancelled) setFunnel('error') })
    return () => { cancelled = true }
  }, [campaign.id, delivery, token, funnelAttempt])

  const startEdit = () => {
    setName(campaign.name)
    setContent(campaign.content ?? '')
    setSegmentIds(campaign.segmentIds)
    setScheduleAt(delivery === 'sent' ? '' : toLocalInput(campaign.startAt))
    setMinSchedule(toLocalInput(new Date(Date.now() + 60_000).toISOString()))
    setError('')
    setEditing(true)
  }

  const submit = async (mode: SaveMode, event?: FormEvent) => {
    event?.preventDefault()
    if (saving) return
    setError('')
    if (!name.trim() || !content.trim()) { setError('Nhập tên và nội dung chiến dịch.'); return }
    const startAt = fromLocalInput(scheduleAt)
    if (mode === 'send' && segmentIds.length === 0) { setError('Chọn ít nhất một phân khúc nhận chiến dịch.'); return }
    if (mode === 'send' && startAt && new Date(startAt).getTime() <= Date.now()) {
      setError('Giờ hẹn gửi phải ở tương lai (hoặc để trống để gửi ngay).')
      return
    }
    if (delivery === 'scheduled' && !scheduleAt) {
      setError('Chọn giờ gửi. Muốn phát ngay thì đóng phần sửa và bấm Gửi ngay.')
      return
    }
    if (delivery === 'scheduled' && startAt && new Date(startAt).getTime() <= Date.now()) {
      setError('Giờ hẹn gửi phải ở tương lai.')
      return
    }
    setSaving(true)
    try {
      let result: Campaign
      if (delivery === 'draft') {
        result = await updateCampaign(token, campaign.id, { name: name.trim(), content: content.trim(), startAt, segmentIds })
        if (mode === 'send') result = await sendDraftCampaign(token, result.id)
      } else if (delivery === 'scheduled') {
        result = await updateCampaign(token, campaign.id, { name: name.trim(), content: content.trim(), startAt })
      } else {
        result = await updateCampaign(token, campaign.id, { name: name.trim(), content: content.trim() })
      }
      setEditing(false)
      onCommitted(campaign.id, result, outcomeMessage(delivery, result, mode))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được chiến dịch')
    } finally {
      setSaving(false)
    }
  }

  const sendSavedDraft = async () => {
    const later = campaign.startAt && new Date(campaign.startAt).getTime() > Date.now()
    const accepted = await confirm({
      title: 'Gửi chiến dịch',
      message: later ? <>Lên lịch gửi <strong>{campaign.name}</strong> lúc {timeVi(campaign.startAt)}?</> : <>Gửi <strong>{campaign.name}</strong> tới các phân khúc đã chọn ngay bây giờ?</>,
      confirmLabel: later ? 'Lên lịch' : 'Gửi',
    })
    if (!accepted || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await sendDraftCampaign(token, campaign.id)
      onCommitted(campaign.id, result, outcomeMessage(delivery, result, 'send'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không gửi được bản nháp')
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    const accepted = await confirm({
      title: 'Gửi ngay',
      message: <>Gửi <strong>{campaign.name}</strong> ngay thay vì chờ tới {timeVi(campaign.startAt)}?</>,
      confirmLabel: 'Gửi ngay',
    })
    if (!accepted || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await updateCampaign(token, campaign.id, {
        name: campaign.name,
        content: campaign.content ?? '',
        startAt: new Date().toISOString(),
      })
      onCommitted(campaign.id, result, outcomeMessage(delivery, result, 'send'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không gửi được')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const accepted = await confirm({
      title: delivery === 'draft' ? 'Xoá bản nháp' : 'Huỷ lịch gửi',
      message: <>Xoá chiến dịch <strong>{campaign.name}</strong>?</>,
      confirmLabel: 'Xoá',
      tone: 'danger',
    })
    if (!accepted || saving) return
    setSaving(true)
    setError('')
    try {
      await deleteCampaign(token, campaign.id)
      onDeleted(campaign)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không xoá được')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="campaign-detail-title" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-space-sm border-b border-line px-space-lg py-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            <button type="button" className={buttonClass(editing ? 'primary' : 'outline', 'sm')} disabled={saving} title={delivery === 'sent' ? 'Đổi tên và nội dung thư đã gửi' : undefined} onClick={() => { if (editing) { setEditing(false); setError('') } else startEdit() }}>
              <span className="material-symbols-outlined text-base">{editing ? 'close' : 'edit'}</span>
              {editing ? 'Huỷ sửa' : 'Sửa'}
            </button>
            {!editing && delivery === 'draft' && (
              <button type="button" className={buttonClass('primary', 'sm')} disabled={saving} onClick={() => void sendSavedDraft()}>Gửi</button>
            )}
            {!editing && delivery === 'scheduled' && (
              <button type="button" className={buttonClass('primary', 'sm')} disabled={saving} onClick={() => void sendNow()}>Gửi ngay</button>
            )}
            {delivery !== 'sent' && (
              <button type="button" className={buttonClass('danger', 'sm')} disabled={saving} onClick={() => void remove()}>
                <span className="material-symbols-outlined text-base">delete</span>
                Xoá
              </button>
            )}
          </div>
          <button ref={closeRef} type="button" aria-label="Đóng" onClick={onClose} className="material-symbols-outlined rounded-lg p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer">close</button>
        </div>
        <div className="flex-1 space-y-space-md overflow-y-auto p-space-lg">
          <div className="flex flex-wrap items-center gap-space-sm">
            <h2 id="campaign-detail-title" className="font-headline-md text-headline-md text-on-surface">{campaign.name}</h2>
            <Badge tone={DELIVERY_TONE[delivery]}>{DELIVERY_LABEL[delivery]}</Badge>
            {campaign.referenceType === 'survey' && <Badge tone="info">Khảo sát</Badge>}
          </div>
          {flash && !editing && <p role="status" className="font-body-md text-body-md text-secondary">{flash}</p>}
          {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
          {editing ? (
            <form className="space-y-3.5" onSubmit={(event) => void submit(delivery === 'draft' ? 'send' : 'save', event)}>
              {delivery === 'sent' && (
                <p className="font-body-md text-body-md text-on-surface-variant">Tên và nội dung cập nhật vào thư đã gửi. Lịch gửi giữ nguyên.</p>
              )}
              <label className={fieldClass}>
                Tên chiến dịch
                <input className={controlClass} required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className={fieldClass}>
                Nội dung thông báo
                <textarea className={controlClass} required rows={4} maxLength={500} value={content} onChange={(event) => setContent(event.target.value)} />
              </label>
              {delivery === 'sent' ? (
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant mb-1">Phân khúc</div>
                  <SegmentBadges ids={campaign.segmentIds} nameOf={segmentName} />
                </div>
              ) : (
                <SegmentPicker
                  segments={segments}
                  selectedIds={segmentIds}
                  onChange={setSegmentIds}
                  disabled={delivery === 'scheduled'}
                  lockedHint={delivery === 'scheduled' ? 'không đổi được sau khi đã lên lịch' : undefined}
                />
              )}
              {delivery !== 'sent' && (
                <label className={fieldClass}>
                  Hẹn giờ gửi {delivery === 'draft' && <span className="font-normal">(để trống = gửi ngay)</span>}
                  <input className={controlClass} type="datetime-local" min={minSchedule} value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
                </label>
              )}
              {delivery === 'draft' && scheduleAt && (
                <button type="button" className={buttonClass('outline', 'sm')} onClick={() => setScheduleAt('')}>Bỏ hẹn giờ</button>
              )}
              <div className="flex flex-wrap justify-end gap-space-sm">
                {delivery === 'draft' && (
                  <button type="button" className={buttonClass('outline')} disabled={saving} onClick={() => void submit('draft')}>Lưu nháp</button>
                )}
                <button type="submit" className={buttonClass('primary')} disabled={saving}>
                  {saving ? 'Đang lưu…' : delivery === 'draft' ? (scheduleAt ? 'Lên lịch gửi' : 'Gửi ngay') : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <DetailBlock title="Nội dung">
                <p className="whitespace-pre-wrap break-words font-body-md text-body-md text-on-surface">{campaign.content || 'Chưa có nội dung'}</p>
              </DetailBlock>
              <DetailBlock title="Đối tượng và lịch">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <div className={a.statLabel}>Phân khúc</div>
                    <SegmentBadges ids={campaign.segmentIds} nameOf={segmentName} />
                  </div>
                  <div>
                    <div className={a.statLabel}>Lịch gửi</div>
                    <div className="font-title-md text-title-md text-on-surface">{scheduleLabel(campaign)}</div>
                    {campaign.endAt && <div className="font-label-md text-label-md text-on-surface-variant">Đo chuyển đổi đến {timeVi(campaign.endAt)}</div>}
                  </div>
                  <div>
                    <div className={a.statLabel}>Đã gửi</div>
                    <div className="font-title-md text-title-md text-on-surface">{delivery === 'draft' ? '—' : campaign.sentCount}</div>
                  </div>
                  <div>
                    <div className={a.statLabel}>Đã đọc</div>
                    <div className="font-title-md text-title-md text-on-surface">{delivery === 'sent' ? campaign.readCount : '—'}</div>
                  </div>
                </div>
              </DetailBlock>
              {campaign.skipped.length > 0 && (
                <DetailBlock title={`Bỏ qua (${campaign.skipped.length})`}>
                  <ul className="divide-y divide-line">
                    {campaign.skipped.map((row) => (
                      <li key={row.userId} className="flex items-center justify-between gap-space-sm py-2">
                        <span className="font-body-md text-body-md text-on-surface">{row.fullName ?? 'Khách'}</span>
                        <Badge tone="neutral">{SKIPPED_STATUS[row.status] ?? row.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              )}
              {delivery === 'sent' && (
                <DetailBlock title="Phễu chuyển đổi">
                  {funnel === null && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải phễu…</p>}
                  {funnel === 'error' && (
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <span className="font-body-md text-body-md text-error">Không tải được phễu chuyển đổi.</span>
                      <button type="button" className={buttonClass('outline', 'sm')} onClick={() => { setFunnel(null); setFunnelAttempt((n) => n + 1) }}>Thử lại</button>
                    </div>
                  )}
                  {funnel && funnel !== 'error' && (
                    <div className="space-y-space-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-md">
                        {([['Nhắm tới', funnel.targeted], ['Đã gửi', funnel.sent], ['Đã đọc', funnel.opened], ['Đã mua', funnel.converted]] as const).map(([label, value]) => (
                          <div key={label}>
                            <div className={a.statLabel}>{label}</div>
                            <div className="font-headline-md text-headline-md text-on-surface">{value}</div>
                          </div>
                        ))}
                        <div>
                          <div className={a.statLabel}>Tỉ lệ chuyển đổi</div>
                          <div className="font-headline-md text-headline-md text-primary">{Number(funnel.conversionRate ?? 0).toFixed(1)}%</div>
                        </div>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {funnel.convertible
                          ? 'Đã mua: khách nhận thư rồi mua sản phẩm mục tiêu trong thời gian chiến dịch.'
                          : 'Chiến dịch không gắn sản phẩm. Đã mua: khách nhận thư rồi có đơn bất kỳ được giao trong thời gian chiến dịch.'}
                      </p>
                    </div>
                  )}
                </DetailBlock>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

/**
 * Chiến dịch in-app tới phân khúc. Bấm một dòng để mở panel chi tiết; sửa, gửi và xoá nằm trong panel.
 * Soạn mới vẫn dùng biểu mẫu phía trên danh sách.
 */
export default function AdminCampaignsPage() {
  const { token } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [flash, setFlash] = useState<{ id: string; message: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [segmentIds, setSegmentIds] = useState<string[]>([])
  const [scheduleAt, setScheduleAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [minSchedule, setMinSchedule] = useState('')
  const stampMinSchedule = () => setMinSchedule(toLocalInput(new Date(Date.now() + 60_000).toISOString()))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const viewed = useRecentViews('campaigns')

  const load = useCallback(() => {
    if (!token) return
    fetchCampaigns(token)
      .then((data) => { setCampaigns(data.campaigns); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được chiến dịch'))
  }, [token])

  useEffect(load, [load])
  useEffect(() => {
    if (token) fetchSegments(token).then((d) => setSegments(d.segments)).catch(() => setSegments([]))
  }, [token])

  const segmentName = useCallback((id: string) => segments.find((s) => s.id === id)?.name ?? id.slice(0, 8), [segments])
  const closePanel = useCallback(() => setSelectedId(null), [])

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: campaigns?.length ?? 0, draft: 0, scheduled: 0, sent: 0 }
    for (const c of campaigns ?? []) result[deliveryOf(c)] += 1
    return result
  }, [campaigns])

  const shown = useMemo(() => campaigns?.filter((c) => (filter === 'all' || deliveryOf(c) === filter)
    && matches(query, c.name, c.content, ...c.segmentIds.map(segmentName))) ?? null, [campaigns, filter, query, segmentName])

  const selected = campaigns?.find((campaign) => campaign.id === selectedId) ?? null

  const resetForm = () => {
    setName(''); setContent(''); setSegmentIds([]); setScheduleAt(''); setShowForm(false)
  }

  const openNew = () => {
    if (showForm) { resetForm(); return }
    resetForm()
    setShowForm(true)
    setSelectedId(null)
    setFlash(null)
    setNotice('')
    stampMinSchedule()
  }

  const openCampaign = (c: Campaign) => {
    resetForm()
    setSelectedId(c.id)
    setError('')
    setNotice('')
    setFlash(null)
    viewed.push(c.id, c.name)
  }

  const commit = (previousId: string, next: Campaign, message: string) => {
    setCampaigns((current) => {
      if (!current) return [next]
      if (previousId === next.id) return current.map((item) => item.id === next.id ? next : item)
      const replaced = current.map((item) => item.id === previousId ? next : item)
      return replaced.some((item) => item.id === next.id) ? replaced : [next, ...current]
    })
    setSelectedId(next.id)
    setFlash({ id: next.id, message })
    setNotice(message)
    setError('')
    load()
  }

  const removeFromList = (c: Campaign) => {
    setCampaigns((current) => current?.filter((item) => item.id !== c.id) ?? current)
    setSelectedId(null)
    setFlash(null)
    setNotice(`Đã xoá "${c.name}".`)
    setError('')
    load()
  }

  const submit = async (mode: 'draft' | 'send', event?: FormEvent) => {
    event?.preventDefault()
    if (!token || saving) return
    setError('')
    if (!name.trim() || !content.trim()) { setError('Nhập tên và nội dung chiến dịch.'); return }
    const startAt = fromLocalInput(scheduleAt)
    if (mode === 'send') {
      if (segmentIds.length === 0) { setError('Chọn ít nhất một phân khúc nhận chiến dịch.'); return }
      if (startAt && new Date(startAt).getTime() <= Date.now()) { setError('Giờ hẹn gửi phải ở tương lai (hoặc để trống để gửi ngay).'); return }
    }
    setSaving(true)
    try {
      const result = await createCampaign(token, { name: name.trim(), segmentIds, content: content.trim(), startAt, draft: mode === 'draft' })
      const delivery = deliveryOf(result)
      setNotice(delivery === 'draft'
        ? `Đã lưu nháp "${result.name}". Chưa gửi cho khách nào.`
        : delivery === 'scheduled'
          ? `Đã lên lịch "${result.name}" gửi lúc ${timeVi(result.startAt)}.`
          : `Đã gửi "${result.name}" tới ${result.sentCount} khách${result.skipped.length ? `, bỏ qua ${result.skipped.length} khách không còn hoạt động` : ''}.`)
      resetForm()
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được chiến dịch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Chiến dịch chăm sóc ({shown?.length ?? 0})</h1>
        <div className="flex flex-wrap items-start gap-2.5">
          <SearchBox page="campaigns" placeholder="Tìm tên, nội dung, phân khúc..." value={query} onChange={setQuery} />
          <button type="button" className={buttonClass(showForm ? 'outline' : 'primary')} onClick={openNew}>{showForm ? 'Đóng' : '+ Tạo chiến dịch'}</button>
        </div>
      </div>
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {notice && <p role="status" className="font-body-md text-body-md text-secondary mb-space-md">{notice}</p>}

      {showForm && (
        <form className={a.catalogForm} onSubmit={(e) => void submit('send', e)}>
          <div className={a.formHeading}>
            <h2>Chiến dịch mới</h2>
            <button type="button" className={buttonClass('outline', 'sm')} onClick={resetForm}>Huỷ</button>
          </div>
          <label className={a.formWide}>Tên chiến dịch<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ưu đãi cuối tuần cho khách trung thành" /></label>
          <label className={a.formWide}>Nội dung thông báo<textarea required rows={3} maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung khách sẽ thấy trong mục Thông báo" /></label>
          <SegmentPicker className="md:col-span-2" segments={segments} selectedIds={segmentIds} onChange={setSegmentIds} />
          <label>Hẹn giờ gửi <span className="font-normal">(để trống = gửi ngay)</span>
            <input type="datetime-local" min={minSchedule} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </label>
          <div className="flex items-end">
            {scheduleAt && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => setScheduleAt('')}>Bỏ hẹn giờ</button>}
          </div>
          <div className={a.formActions}>
            <button type="button" className={buttonClass('outline')} disabled={saving} onClick={() => void submit('draft')}>Lưu nháp</button>
            <button type="submit" className={buttonClass('primary')} disabled={saving}>
              {saving ? 'Đang lưu…' : scheduleAt ? 'Lên lịch gửi' : 'Gửi ngay'}
            </button>
          </div>
        </form>
      )}

      <StatusFilter options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => {
        const c = campaigns?.find((item) => item.id === id)
        if (c) openCampaign(c)
      }} />

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Chiến dịch</th><th>Phân khúc</th><th>Trạng thái</th><th>Đã gửi</th><th>Đã đọc</th><th>Lịch gửi</th></tr></thead>
          <tbody>
            {!shown && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">{error ? 'Không tải được danh sách.' : 'Đang tải…'}</td></tr>}
            {shown?.length === 0 && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">{campaigns?.length ? 'Không có chiến dịch nào khớp bộ lọc.' : 'Chưa có chiến dịch nào.'}</td></tr>}
            {shown?.map((c) => {
              const delivery = deliveryOf(c)
              const selectedRow = selectedId === c.id
              return (
                <tr key={c.id} aria-selected={selectedRow} className={`cursor-pointer ${selectedRow ? 'is-selected' : ''}`} onClick={() => openCampaign(c)}>
                  <td>
                    <button type="button" className="block border-0 bg-transparent p-0 text-left font-semibold text-on-surface cursor-pointer hover:text-primary" aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); openCampaign(c) }}>{c.name}</button>
                    {c.content && <div className="font-label-md text-label-md text-on-surface-variant line-clamp-1 max-w-xs">{c.content}</div>}
                    {c.referenceType === 'survey' && <Badge tone="info">Khảo sát</Badge>}
                  </td>
                  <td className="max-w-[220px]"><SegmentBadges ids={c.segmentIds} nameOf={segmentName} /></td>
                  <td><Badge tone={DELIVERY_TONE[delivery]}>{DELIVERY_LABEL[delivery]}</Badge></td>
                  <td>{delivery === 'draft' ? '—' : c.sentCount}</td>
                  <td>{delivery === 'sent' ? c.readCount : '—'}</td>
                  <td className="whitespace-nowrap">{scheduleLabel(c)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && token && (
        <CampaignDetailPanel
          key={selected.id}
          campaign={selected}
          segments={segments}
          token={token}
          flash={flash?.id === selected.id ? flash.message : ''}
          onClose={closePanel}
          onCommitted={commit}
          onDeleted={removeFromList}
        />
      )}
    </div>
  )
}
