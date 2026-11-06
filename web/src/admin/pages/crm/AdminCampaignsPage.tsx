import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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

const FILTERS = [['all', 'Tất cả'], ['draft', 'Bản nháp'], ['scheduled', 'Đã lên lịch'], ['sent', 'Đã gửi']] as const
const DELIVERY_LABEL: Record<Delivery, string> = { draft: 'Bản nháp', scheduled: 'Đã lên lịch', sent: 'Đã gửi' }
const DELIVERY_TONE: Record<Delivery, 'neutral' | 'info' | 'success'> = { draft: 'neutral', scheduled: 'info', sent: 'success' }

const deliveryOf = (c: Campaign): Delivery => (c.deliveryStatus === 'draft' || c.deliveryStatus === 'scheduled' ? c.deliveryStatus : 'sent')

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

/**
 * Chiến dịch in-app tới phân khúc (p5-03/p5-11) + phễu chuyển đổi. Bộ phận Kinh doanh.
 * Soạn xong có thể gửi ngay, hẹn giờ gửi, hoặc lưu nháp để gửi sau.
 */
export default function AdminCampaignsPage() {
  const { token } = useAuth()
  const { confirm } = useDialog()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [segmentIds, setSegmentIds] = useState<string[]>([])
  const [scheduleAt, setScheduleAt] = useState('')
  const [saving, setSaving] = useState(false)
  // Mốc sớm nhất cho ô hẹn giờ, tính lại mỗi lần mở biểu mẫu.
  const [minSchedule, setMinSchedule] = useState('')
  const stampMinSchedule = () => setMinSchedule(toLocalInput(new Date(Date.now() + 60_000).toISOString()))
  const [funnels, setFunnels] = useState<Record<string, CampaignFunnel | 'loading' | 'error'>>({})
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

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: campaigns?.length ?? 0, draft: 0, scheduled: 0, sent: 0 }
    for (const c of campaigns ?? []) result[deliveryOf(c)] += 1
    return result
  }, [campaigns])

  const shown = useMemo(() => campaigns?.filter((c) => (filter === 'all' || deliveryOf(c) === filter)
    && matches(query, c.name, c.content, ...c.segmentIds.map(segmentName))) ?? null, [campaigns, filter, query, segmentName])

  const resetForm = () => {
    setEditing(null); setName(''); setContent(''); setSegmentIds([]); setScheduleAt(''); setShowForm(false)
  }

  const openNew = () => {
    if (showForm && !editing) { resetForm(); return }
    resetForm(); setShowForm(true); setNotice(''); stampMinSchedule()
  }

  const openEdit = (c: Campaign) => {
    setEditing(c)
    setName(c.name)
    setContent(c.content ?? '')
    setSegmentIds(c.segmentIds)
    setScheduleAt(deliveryOf(c) === 'sent' ? '' : toLocalInput(c.startAt))
    setShowForm(true)
    setNotice('')
    stampMinSchedule()
    viewed.push(c.id, c.name)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editingDelivery = editing ? deliveryOf(editing) : null
  const segmentsLocked = editingDelivery === 'scheduled'

  /** mode: 'draft' = chỉ lưu nháp; 'send' = gửi ngay hoặc lên lịch theo giờ hẹn. */
  const submit = async (mode: 'draft' | 'send', event?: FormEvent) => {
    event?.preventDefault()
    if (!token) return
    setError('')
    if (!name.trim() || !content.trim()) { setError('Nhập tên và nội dung chiến dịch.'); return }
    const startAt = fromLocalInput(scheduleAt)
    if (mode === 'send') {
      if (segmentIds.length === 0) { setError('Chọn ít nhất một phân khúc nhận chiến dịch.'); return }
      if (startAt && new Date(startAt).getTime() <= Date.now()) { setError('Giờ hẹn gửi phải ở tương lai (hoặc để trống để gửi ngay).'); return }
    }
    setSaving(true)
    try {
      let result: Campaign
      if (!editing) {
        result = await createCampaign(token, { name: name.trim(), segmentIds, content: content.trim(), startAt, draft: mode === 'draft' })
      } else if (editingDelivery === 'draft') {
        result = await updateCampaign(token, editing.id, { name: name.trim(), content: content.trim(), startAt, segmentIds })
        if (mode === 'send') result = await sendDraftCampaign(token, editing.id)
      } else {
        result = await updateCampaign(token, editing.id, { name: name.trim(), content: content.trim(), startAt })
      }
      const delivery = deliveryOf(result)
      setNotice(delivery === 'draft'
        ? `Đã lưu nháp "${result.name}". Chưa gửi cho khách nào.`
        : delivery === 'scheduled'
          ? `Đã lên lịch "${result.name}" gửi lúc ${timeVi(result.startAt)}.`
          : `Đã gửi "${result.name}" tới ${result.sentCount} khách${result.skipped?.length ? `, bỏ qua ${result.skipped.length} khách không còn hoạt động` : ''}.`)
      resetForm()
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được chiến dịch')
    } finally {
      setSaving(false)
    }
  }

  const toggleFunnel = (c: Campaign) => {
    if (!token) return
    const id = c.id
    if (funnels[id]) { setFunnels(({ [id]: _drop, ...rest }) => rest); return }
    viewed.push(c.id, c.name)
    setFunnels((f) => ({ ...f, [id]: 'loading' }))
    fetchCampaignFunnel(token, id)
      .then((data) => setFunnels((f) => ({ ...f, [id]: data })))
      .catch(() => setFunnels((f) => ({ ...f, [id]: 'error' })))
  }

  const run = async (fn: () => Promise<unknown>, ok: string, fallback: string) => {
    setError(''); setNotice('')
    try { await fn(); setNotice(ok); load() } catch (e) { setError(e instanceof ApiError ? e.message : fallback) }
  }

  const sendDraft = async (c: Campaign) => {
    if (!token) return
    const later = c.startAt && new Date(c.startAt).getTime() > Date.now()
    if (!(await confirm({ title: 'Gửi chiến dịch', message: later ? <>Lên lịch gửi <strong>{c.name}</strong> lúc {timeVi(c.startAt)}?</> : <>Gửi <strong>{c.name}</strong> tới các phân khúc đã chọn ngay bây giờ?</>, confirmLabel: later ? 'Lên lịch' : 'Gửi' }))) return
    void run(() => sendDraftCampaign(token, c.id), later ? `Đã lên lịch "${c.name}".` : `Đã gửi "${c.name}".`, 'Không gửi được bản nháp')
  }

  const sendNow = async (c: Campaign) => {
    if (!token || !(await confirm({ title: 'Gửi ngay', message: <>Gửi <strong>{c.name}</strong> ngay thay vì chờ tới {timeVi(c.startAt)}?</>, confirmLabel: 'Gửi ngay' }))) return
    void run(() => updateCampaign(token, c.id, { name: c.name, content: c.content ?? '', startAt: new Date().toISOString() }), `Đã gửi "${c.name}".`, 'Không gửi được')
  }

  const remove = async (c: Campaign) => {
    if (!token || !(await confirm({ title: deliveryOf(c) === 'draft' ? 'Xoá bản nháp' : 'Huỷ lịch gửi', message: <>Xoá chiến dịch <strong>{c.name}</strong>?</>, confirmLabel: 'Xoá', tone: 'danger' }))) return
    if (editing?.id === c.id) resetForm()
    void run(() => deleteCampaign(token, c.id), `Đã xoá "${c.name}".`, 'Không xoá được')
  }


  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Chiến dịch chăm sóc ({shown?.length ?? 0})</h1>
        <div className="flex flex-wrap items-start gap-2.5">
          <SearchBox page="campaigns" placeholder="Tìm tên, nội dung, phân khúc..." value={query} onChange={setQuery} />
          <button type="button" className={buttonClass(showForm && !editing ? 'outline' : 'primary')} onClick={openNew}>{showForm && !editing ? 'Đóng' : '+ Tạo chiến dịch'}</button>
        </div>
      </div>
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {notice && <p className="font-body-md text-body-md text-secondary mb-space-md">{notice}</p>}

      {showForm && (
        <form className={a.catalogForm} onSubmit={(e) => void submit('send', e)}>
          <div className={a.formHeading}>
            <h2>{!editing ? 'Chiến dịch mới' : editingDelivery === 'draft' ? 'Sửa bản nháp' : 'Sửa chiến dịch đã lên lịch'}</h2>
            <button type="button" className={buttonClass('outline', 'sm')} onClick={resetForm}>Huỷ</button>
          </div>
          <label className={a.formWide}>Tên chiến dịch<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ưu đãi cuối tuần cho khách trung thành" /></label>
          <label className={a.formWide}>Nội dung thông báo<textarea required rows={3} maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung khách sẽ thấy trong mục Thông báo" /></label>
          <fieldset className="md:col-span-2" disabled={segmentsLocked}>
            <legend className="font-label-md text-label-md text-on-surface-variant mb-1">
              Gửi tới phân khúc{segmentsLocked && ' (không đổi được sau khi đã lên lịch)'}
            </legend>
            {segments.length === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Chưa có phân khúc — tạo ở mục Phân khúc trước.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                {segments.map((s) => (
                  <label key={s.id} className="!flex-row items-center gap-space-xs !text-on-surface cursor-pointer">
                    <input type="checkbox" checked={segmentIds.includes(s.id)} onChange={() => setSegmentIds((v) => v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id])} />
                    {s.name} <span className="text-on-surface-variant">({s.memberCount} khách)</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <label>Hẹn giờ gửi <span className="font-normal">(để trống = gửi ngay)</span>
            <input type="datetime-local" min={minSchedule} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </label>
          <div className="flex items-end">
            {scheduleAt && !segmentsLocked && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => setScheduleAt('')}>Bỏ hẹn giờ</button>}
          </div>
          <div className={a.formActions}>
            {editingDelivery !== 'scheduled' && (
              <button type="button" className={buttonClass('outline')} disabled={saving} onClick={() => void submit('draft')}>Lưu nháp</button>
            )}
            <button type="submit" className={buttonClass('primary')} disabled={saving}>
              {saving ? 'Đang lưu…' : editingDelivery === 'scheduled' ? 'Lưu thay đổi' : scheduleAt ? 'Lên lịch gửi' : 'Gửi ngay'}
            </button>
          </div>
        </form>
      )}

      <StatusFilter options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
      <RecentViews items={viewed.items} onClear={viewed.clear} onOpen={(id) => {
        const c = campaigns?.find((x) => x.id === id)
        if (!c) return
        if (deliveryOf(c) === 'sent') { if (!funnels[c.id]) toggleFunnel(c) } else openEdit(c)
      }} />

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Chiến dịch</th><th>Phân khúc</th><th>Trạng thái</th><th>Đã gửi</th><th>Đã đọc</th><th>Lịch gửi</th><th /></tr></thead>
          <tbody>
            {!shown && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {shown?.length === 0 && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">{campaigns?.length ? 'Không có chiến dịch nào khớp bộ lọc.' : 'Chưa có chiến dịch nào.'}</td></tr>}
            {shown?.map((c) => {
              const funnel = funnels[c.id]
              const delivery = deliveryOf(c)
              return (
                <Fragment key={c.id}>
                  <tr className={editing?.id === c.id ? 'is-selected' : ''}>
                    <td>
                      <div className="font-semibold">{c.name}</div>
                      {c.content && <div className="font-label-md text-label-md text-on-surface-variant line-clamp-1 max-w-xs">{c.content}</div>}
                      {c.referenceType === 'survey' && <Badge tone="info">Khảo sát</Badge>}
                    </td>
                    <td className="max-w-[220px]">
                      {c.segmentIds.length === 0
                        ? <span className="text-on-surface-variant">Chưa chọn</span>
                        : <div className="flex flex-wrap gap-1">{c.segmentIds.map((id) => <Badge key={id}>{segmentName(id)}</Badge>)}</div>}
                    </td>
                    <td><Badge tone={DELIVERY_TONE[delivery]}>{DELIVERY_LABEL[delivery]}</Badge></td>
                    <td>{delivery === 'draft' ? '—' : c.sentCount}</td>
                    <td>{delivery === 'sent' ? c.readCount : '—'}</td>
                    <td className="whitespace-nowrap">{c.startAt ? timeVi(c.startAt) : delivery === 'draft' ? 'Gửi ngay khi bấm gửi' : '—'}</td>
                    <td>
                      <div className={a.rowActions}>
                        {delivery === 'sent' && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => toggleFunnel(c)}>{funnel ? 'Ẩn phễu' : 'Phễu'}</button>}
                        {delivery !== 'sent' && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => openEdit(c)}>Sửa</button>}
                        {delivery === 'draft' && <button type="button" className={buttonClass('primary', 'sm')} onClick={() => void sendDraft(c)}>Gửi</button>}
                        {delivery === 'scheduled' && <button type="button" className={buttonClass('primary', 'sm')} onClick={() => void sendNow(c)}>Gửi ngay</button>}
                        {delivery !== 'sent' && <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void remove(c)}>Xoá</button>}
                      </div>
                    </td>
                  </tr>
                  {funnel && (
                    <tr>
                      <td colSpan={7} className="!bg-surface-container-low">
                        {funnel === 'loading' && 'Đang tải phễu…'}
                        {funnel === 'error' && <span className="text-error">Không tải được phễu chuyển đổi.</span>}
                        {typeof funnel === 'object' && (
                          <div className="flex flex-wrap items-center gap-space-lg">
                            {[['Nhắm tới', funnel.targeted], ['Đã gửi', funnel.sent], ['Đã đọc', funnel.opened], ['Đã mua', funnel.converted]].map(([label, value]) => (
                              <div key={label as string}><div className={a.statLabel}>{label}</div><div className="font-headline-md text-headline-md">{value as number}</div></div>
                            ))}
                            <div><div className={a.statLabel}>Tỉ lệ chuyển đổi</div><div className="font-headline-md text-headline-md text-primary">{Number(funnel.conversionRate ?? 0).toFixed(1)}%</div></div>
                            <span className="font-body-md text-body-md text-on-surface-variant">
                              {funnel.convertible
                                ? '"Đã mua" = khách nhận thư rồi mua sản phẩm mục tiêu trong thời gian chiến dịch.'
                                : 'Chiến dịch không gắn sản phẩm: "Đã mua" = khách nhận thư rồi có đơn bất kỳ được giao trong thời gian chiến dịch.'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
