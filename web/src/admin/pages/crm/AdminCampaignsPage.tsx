import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react'
import { a } from '../../adminUi'
import { Badge, buttonClass } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import {
  createCampaign, deleteCampaign, fetchCampaignFunnel, fetchCampaigns, fetchSegments, timeVi,
  type Campaign, type CampaignFunnel, type Segment,
} from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { useDialog } from '../../../state/DialogContext'

/** Chiến dịch in-app tới phân khúc (p5-03/p5-11) + phễu chuyển đổi. Sales + admin. */
export default function AdminCampaignsPage() {
  const { token } = useAuth()
  const { confirm } = useDialog()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [segmentIds, setSegmentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [funnels, setFunnels] = useState<Record<string, CampaignFunnel | 'loading' | 'error'>>({})

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

  const segmentName = (id: string) => segments.find((s) => s.id === id)?.name ?? id.slice(0, 8)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    if (segmentIds.length === 0) { setError('Chọn ít nhất một phân khúc nhận chiến dịch.'); return }
    setSaving(true)
    try {
      const created = await createCampaign(token, { name: name.trim(), segmentIds, content: content.trim() })
      setNotice(`Đã gửi "${created.name}" tới ${created.sentCount} khách${created.skipped.length ? `, bỏ qua ${created.skipped.length} khách không còn hoạt động` : ''}.`)
      setName(''); setContent(''); setSegmentIds([]); setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được chiến dịch')
    } finally {
      setSaving(false)
    }
  }

  const toggleFunnel = (id: string) => {
    if (!token) return
    if (funnels[id]) { setFunnels(({ [id]: _drop, ...rest }) => rest); return }
    setFunnels((f) => ({ ...f, [id]: 'loading' }))
    fetchCampaignFunnel(token, id)
      .then((data) => setFunnels((f) => ({ ...f, [id]: data })))
      .catch(() => setFunnels((f) => ({ ...f, [id]: 'error' })))
  }

  const remove = async (c: Campaign) => {
    if (!token || !(await confirm({ title: 'Xoá chiến dịch', message: <>Xoá chiến dịch <strong>{c.name}</strong>?</>, confirmLabel: 'Xoá', tone: 'danger' }))) return
    try { await deleteCampaign(token, c.id); load() } catch (e) { setError(e instanceof ApiError ? e.message : 'Không xoá được') }
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Chiến dịch chăm sóc</h1>
        <button type="button" className={buttonClass(showForm ? 'outline' : 'primary')} onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng' : '+ Tạo chiến dịch'}</button>
      </div>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {notice && <p className="font-body-md text-body-md text-secondary mb-space-md">{notice}</p>}

      {showForm && (
        <form className={a.catalogForm} onSubmit={submit}>
          <div className={a.formHeading}><h2>Chiến dịch mới</h2></div>
          <label className={a.formWide}>Tên chiến dịch<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ưu đãi cuối tuần cho khách trung thành" /></label>
          <label className={a.formWide}>Nội dung thông báo<textarea required rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung khách sẽ thấy trong mục Thông báo" /></label>
          <fieldset className="md:col-span-2">
            <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Gửi tới phân khúc</legend>
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
          <div className={a.formActions}>
            <button type="submit" className={buttonClass('primary')} disabled={saving}>{saving ? 'Đang gửi…' : 'Gửi chiến dịch'}</button>
          </div>
        </form>
      )}

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Chiến dịch</th><th>Phân khúc</th><th>Đã gửi</th><th>Đã đọc</th><th>Bắt đầu</th><th /></tr></thead>
          <tbody>
            {!campaigns && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {campaigns?.length === 0 && <tr><td colSpan={6} className="text-center !py-space-xl text-on-surface-variant">Chưa có chiến dịch nào.</td></tr>}
            {campaigns?.map((c) => {
              const funnel = funnels[c.id]
              return (
                <Fragment key={c.id}>
                  <tr>
                    <td>
                      <div className="font-semibold">{c.name}</div>
                      {c.content && <div className="font-label-md text-label-md text-on-surface-variant line-clamp-1 max-w-xs">{c.content}</div>}
                      {c.referenceType === 'survey' && <Badge tone="info">Khảo sát</Badge>}
                    </td>
                    <td className="max-w-[220px]"><div className="flex flex-wrap gap-1">{c.segmentIds.map((id) => <Badge key={id}>{segmentName(id)}</Badge>)}</div></td>
                    <td>{c.sentCount}</td>
                    <td>{c.readCount}</td>
                    <td>{timeVi(c.startAt)}</td>
                    <td>
                      <div className={a.rowActions}>
                        <button type="button" className={buttonClass('outline', 'sm')} onClick={() => toggleFunnel(c.id)}>{funnel ? 'Ẩn phễu' : 'Phễu'}</button>
                        <button type="button" className={buttonClass('outline', 'sm')} onClick={() => void remove(c)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                  {funnel && (
                    <tr>
                      <td colSpan={6} className="!bg-surface-container-low">
                        {funnel === 'loading' && 'Đang tải phễu…'}
                        {funnel === 'error' && <span className="text-error">Không tải được phễu chuyển đổi.</span>}
                        {typeof funnel === 'object' && (
                          <div className="flex flex-wrap items-center gap-space-lg">
                            {[['Nhắm tới', funnel.targeted], ['Đã gửi', funnel.sent], ['Đã mua', funnel.converted]].map(([label, value]) => (
                              <div key={label as string}><div className={a.statLabel}>{label}</div><div className="font-headline-md text-headline-md">{value as number}</div></div>
                            ))}
                            <div><div className={a.statLabel}>Tỉ lệ chuyển đổi</div><div className="font-headline-md text-headline-md text-primary">{Number(funnel.conversionRate ?? 0).toFixed(1)}%</div></div>
                            {!funnel.convertible && <span className="font-body-md text-body-md text-on-surface-variant">Chiến dịch không gắn sản phẩm nên không đo được lượt mua.</span>}
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
