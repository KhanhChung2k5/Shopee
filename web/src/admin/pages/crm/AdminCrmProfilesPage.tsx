import { useCallback, useEffect, useMemo, useState } from 'react'
import { a, chipClass } from '../../adminUi'
import { Badge, buttonClass } from '../../../components/ui'
import { ApiError } from '../../../lib/api'
import { formatVnd } from '../../../lib/catalog'
import { RFM_LABEL, RFM_TONE, fetchCustomerReport, recalculateProfile, type CustomerReport } from '../../../lib/crm'
import { useAuth } from '../../../state/AuthContext'

/** CRM: hồ sơ khách hàng, LTV và phân loại RFM (p5-01/p5-09). */
export default function AdminCrmProfilesPage() {
  const { token } = useAuth()
  const [report, setReport] = useState<CustomerReport | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [rfm, setRfm] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)

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
  const totalLtv = customers.reduce((sum, c) => sum + Number(c.ltv ?? 0), 0)

  const filtered = customers
    .filter((c) => rfm === 'all' || (c.rfmSegment ?? 'other') === rfm)
    .filter((c) => !query.trim() || (c.fullName ?? '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((x, y) => Number(y.ltv) - Number(x.ltv))

  const recalc = async (id: string) => {
    if (!token) return
    setBusyId(id)
    try {
      await recalculateProfile(token, id)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tính lại được hồ sơ')
    } finally {
      setBusyId(null)
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
          <div className={a.statLabel}>Tổng giá trị vòng đời (LTV)</div>
          <div className={`${a.statValue} !text-primary`}>{formatVnd(totalLtv)}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>Champions + Trung thành</div>
          <div className={`${a.statValue} !text-secondary`}>{(rfmCounts.champions ?? 0) + (rfmCounts.loyal ?? 0)}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>Có nguy cơ rời bỏ</div>
          <div className={`${a.statValue} !text-error`}>{rfmCounts.at_risk ?? 0}</div>
        </div>
      </div>

      <div className={a.toolbar}>
        <input className={`${a.input} !w-72`} type="search" placeholder="Tìm theo tên khách hàng..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className={a.filterBar}>
          {['all', 'champions', 'loyal', 'potential', 'at_risk', 'lost', 'other'].map((key) => (
            <button key={key} type="button" className={chipClass(rfm === key)} onClick={() => setRfm(key)}>
              {key === 'all' ? 'Tất cả' : RFM_LABEL[key]} {key !== 'all' && <span className="opacity-70">({rfmCounts[key] ?? 0})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr><th>Khách hàng</th><th>Nhóm tuổi</th><th>Giới tính</th><th>Số đơn</th><th>LTV</th><th>RFM</th><th /></tr>
          </thead>
          <tbody>
            {!report && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Đang tải…</td></tr>}
            {report && filtered.length === 0 && <tr><td colSpan={7} className="text-center !py-space-xl text-on-surface-variant">Không có khách hàng phù hợp.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.customerId}>
                <td className="font-semibold">{c.fullName ?? '—'}</td>
                <td>{c.ageLabel}</td>
                <td>{c.genderLabel}</td>
                <td>{c.totalOrders}</td>
                <td className="font-bold">{formatVnd(Number(c.ltv))}</td>
                <td><Badge tone={RFM_TONE[c.rfmSegment ?? 'other'] ?? 'neutral'}>{RFM_LABEL[c.rfmSegment ?? 'other'] ?? c.rfmSegment}</Badge></td>
                <td className="text-right">
                  <button type="button" className={buttonClass('outline', 'sm')} disabled={busyId === c.customerId} onClick={() => void recalc(c.customerId)}>
                    {busyId === c.customerId ? 'Đang tính…' : 'Tính lại'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">
        LTV và RFM được tính lại tự động khi đơn hàng chuyển sang "Đã giao". Nút "Tính lại" dùng khi cần cập nhật ngay.
      </p>
    </div>
  )
}
