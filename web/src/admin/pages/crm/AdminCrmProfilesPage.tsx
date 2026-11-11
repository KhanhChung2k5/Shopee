import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { a, chipClass } from '../../adminUi'
import { Badge, buttonClass, cx } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import { RFM_LABEL, RFM_TONE, fetchCustomerReport, recalculateProfile, type CustomerReport } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'
import { SearchBox } from '../../components/ListSearch'
import RfmCustomerPanel from '../../components/RfmCustomerPanel'
import { matches, useViewMode } from '../../components/listSearchState'
import { ViewModeToggle } from '../../components/ViewModeToggle'

/** CRM: hồ sơ khách hàng, LTV và phân loại RFM (p5-01/p5-09). */
export default function AdminCrmProfilesPage() {
  const { token } = useAuth()
  const [report, setReport] = useState<CustomerReport | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [rfm, setRfm] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [panelRevision, setPanelRevision] = useState(0)
  const [layout, setLayout] = useViewMode('crm-profiles')

  const load = useCallback(() => {
    if (!token) return
    fetchCustomerReport(token)
      .then((data) => { setReport(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được hồ sơ khách hàng'))
  }, [token])

  useEffect(load, [load])

  const customers = useMemo(() => report?.customers ?? [], [report])
  const rfmCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of customers) {
      const key = c.rfmSegment ?? 'other'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [customers])
  const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent ?? 0), 0)

  const filtered = customers
    .filter((c) => rfm === 'all' || (c.rfmSegment ?? 'other') === rfm)
    .filter((c) => matches(query, c.fullName, c.ageLabel, c.genderLabel))
    .sort((x, y) => Number(y.ltv) - Number(x.ltv))

  const recalc = async (id: string) => {
    if (!token) return
    setBusyId(id)
    try {
      await recalculateProfile(token, id)
      load()
      setPanelRevision((revision) => revision + 1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tính lại được hồ sơ')
    } finally {
      setBusyId(null)
    }
  }

  const opened = openId ? filtered.find((c) => c.customerId === openId) ?? customers.find((c) => c.customerId === openId) : null

  const openCustomer = (id: string) => setOpenId(id)
  const onCustomerKey = (event: KeyboardEvent, id: string) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openCustomer(id)
    }
  }

  return (
    <div>
      <h1>Hồ sơ & RFM khách hàng</h1>
      {error && <p className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      <div className={a.statRow}>
        <div className={a.card}>
          <div className={a.statLabel}>Tổng khách hàng</div>
          <div className={a.statValue}>{report?.totalCustomers ?? '…'}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>Khách đã chi (sau hoàn tiền)</div>
          <div className="font-headline-md text-headline-md text-on-surface">{formatVnd(totalSpent)}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>Champions + Loyal</div>
          <div className={`${a.statValue} !text-secondary`}>{(rfmCounts.champions ?? 0) + (rfmCounts.loyal ?? 0)}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>At Risk</div>
          <div className={`${a.statValue} !text-error`}>{rfmCounts.at_risk ?? 0}</div>
        </div>
      </div>

      <div className={a.toolbar}>
        <SearchBox page="crm-profiles" placeholder="Tìm theo tên, nhóm tuổi, giới tính..." value={query} onChange={setQuery} />
      </div>
      <div className="mb-space-md flex flex-wrap items-start gap-space-sm">
        <div className={`${a.filterBar} min-w-0 flex-1`}>
          {['all', 'champions', 'loyal', 'potential', 'at_risk', 'lost', 'new', 'other'].map((key) => (
            <button key={key} type="button" className={chipClass(rfm === key)} onClick={() => setRfm(key)}>
              {key === 'all' ? 'Tất cả' : RFM_LABEL[key]} {key !== 'all' && <span className="opacity-70">({rfmCounts[key] ?? 0})</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto shrink-0">
          <ViewModeToggle value={layout} onChange={setLayout} />
        </div>
      </div>

      {layout === 'list' ? (
        <div className={a.tableWrap}>
          <table className={a.table}>
            <thead>
              <tr><th>Khách hàng</th><th>Nhóm tuổi</th><th>Giới tính</th><th>Số đơn</th><th>Đã chi</th><th>LTV dự báo</th><th>RFM</th><th /></tr>
            </thead>
            <tbody>
              {!report && <tr><td colSpan={8} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
              {report && filtered.length === 0 && <tr><td colSpan={8} className="text-center !py-space-xl text-on-surface-variant">Không có khách hàng phù hợp.</td></tr>}
              {filtered.map((c) => (
                <tr
                  key={c.customerId}
                  tabIndex={0}
                  aria-haspopup="dialog"
                  aria-selected={openId === c.customerId}
                  className={cx('cursor-pointer', openId === c.customerId && 'is-selected')}
                  onClick={() => openCustomer(c.customerId)}
                  onKeyDown={(event) => onCustomerKey(event, c.customerId)}
                >
                  <td className="font-semibold">{c.fullName ?? '—'}</td>
                  <td>{c.ageLabel}</td>
                  <td>{c.genderLabel}</td>
                  <td>{c.totalOrders}</td>
                  <td>{formatVnd(Number(c.totalSpent ?? 0))}</td>
                  <td className="font-bold">{formatVnd(Number(c.ltv))}</td>
                  <td><Badge tone={RFM_TONE[c.rfmSegment ?? 'other'] ?? 'neutral'}>{RFM_LABEL[c.rfmSegment ?? 'other'] ?? c.rfmSegment}</Badge></td>
                  <td className="text-right">
                    <button type="button" className={buttonClass('outline', 'sm')} disabled={busyId === c.customerId} onClick={(event) => { event.stopPropagation(); void recalc(c.customerId) }}>
                      {busyId === c.customerId ? 'Đang tính…' : 'Tính lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {!report && <div className={cx(a.card, a.empty)}>Đang tải…</div>}
          {report && filtered.length === 0 && <div className={cx(a.card, a.empty)}>Không có khách hàng phù hợp.</div>}
          {filtered.length > 0 && (
            <div className="grid grid-cols-3 gap-space-md">
              {filtered.map((c) => (
                <article
                  key={c.customerId}
                  tabIndex={0}
                  aria-haspopup="dialog"
                  aria-selected={openId === c.customerId}
                  className={cx(a.card, 'flex cursor-pointer flex-col gap-space-sm', openId === c.customerId && 'ring-2 ring-primary')}
                  onClick={() => openCustomer(c.customerId)}
                  onKeyDown={(event) => onCustomerKey(event, c.customerId)}
                >
                  <div className="flex items-start justify-between gap-space-sm">
                    <h2 className="font-title-md text-title-md text-on-surface">{c.fullName ?? '—'}</h2>
                    <Badge tone={RFM_TONE[c.rfmSegment ?? 'other'] ?? 'neutral'}>{RFM_LABEL[c.rfmSegment ?? 'other'] ?? c.rfmSegment}</Badge>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">{c.ageLabel} · {c.genderLabel}</p>
                  <dl className="grid grid-cols-2 gap-space-sm">
                    <div><dt className={a.statLabel}>Số đơn</dt><dd className="font-title-md text-title-md text-on-surface">{c.totalOrders}</dd></div>
                    <div><dt className={a.statLabel}>Đã chi</dt><dd className="whitespace-nowrap font-title-md text-title-md text-on-surface">{formatVnd(Number(c.totalSpent ?? 0))}</dd></div>
                    <div className="col-span-2"><dt className={a.statLabel}>LTV dự báo</dt><dd className="whitespace-nowrap font-title-md text-title-md text-on-surface">{formatVnd(Number(c.ltv))}</dd></div>
                  </dl>
                  <div className="flex justify-end">
                    <button type="button" className={buttonClass('outline', 'sm')} disabled={busyId === c.customerId} onClick={(event) => { event.stopPropagation(); void recalc(c.customerId) }}>
                      {busyId === c.customerId ? 'Đang tính…' : 'Tính lại'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      {opened && (
        <RfmCustomerPanel
          key={`${opened.customerId}-${panelRevision}`}
          customerId={opened.customerId}
          name={opened.fullName}
          ageLabel={opened.ageLabel}
          genderLabel={opened.genderLabel}
          segment={opened.rfmSegment}
          onClose={() => setOpenId(null)}
        />
      )}
      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        Chọn một khách để xem điểm R, F, M và lịch sử giá trị từng đơn. "Đã chi" là tiền khách thực trả cho các đơn đã giao, sau khi trừ tiền hoàn, cộng cả đời. Điểm F và M chỉ tính đơn trong 365 ngày gần nhất. "LTV dự báo" = giá trị đơn trung bình × số đơn mỗi năm × vòng đời kỳ vọng (2 năm, hoặc lâu hơn nếu khách đã gắn bó lâu hơn), nên không bao giờ thấp hơn số đã chi.
        LTV và RFM được tính lại tự động khi đơn chuyển sang "Đã giao" hoặc được hoàn tiền, và mỗi tối lúc 20:00; khách tự chuyển sang phân khúc RFM mới. Nút "Tính lại" dùng khi cần cập nhật ngay.
      </p>
    </div>
  )
}
