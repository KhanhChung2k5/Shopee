import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { buttonClass } from '../../components/ui'
import LineChart from '../components/LineChart'
import { a, chipClass } from '../adminUi'
import { canSeeInventoryReport, canSeeRevenueReport, type Department } from '../access'
import { downloadCsv, isoDay, type InventoryReport, type RevenueReport } from '../reports'

type Tab = 'revenue' | 'inventory'

const PRODUCT_TYPE_LABEL: Record<string, string> = { game_disc: 'Đĩa game', controller: 'Tay cầm', accessory: 'Phụ kiện' }

const pct = (value: number | null) => (value == null ? '—' : `${value.toLocaleString('vi-VN')}%`)
const dayLabel = (day: string) => { const [, m, d] = day.split('-'); return `${Number(d)}/${Number(m)}` }

/** First day of the current month → today. */
function defaultRange() {
  const today = new Date()
  return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) }
}

export default function AdminReportsPage() {
  const { token, user } = useAuth()
  const department = (user?.department ?? null) as Department | null
  const tabs: Tab[] = [
    ...(canSeeRevenueReport(department) ? ['revenue' as const] : []),
    ...(canSeeInventoryReport(department) ? ['inventory' as const] : []),
  ]
  const [tab, setTab] = useState<Tab>(tabs[0] ?? 'revenue')
  const [range, setRange] = useState(defaultRange)
  const [threshold, setThreshold] = useState(5)
  const [revenue, setRevenue] = useState<RevenueReport | null>(null)
  const [inventory, setInventory] = useState<InventoryReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token || range.from > range.to) return
    setLoading(true)
    try {
      const query = `from=${range.from}&to=${range.to}`
      if (tab === 'revenue') setRevenue(await apiFetch<RevenueReport>(`/api/reports/revenue?${query}`, {}, token))
      else setInventory(await apiFetch<InventoryReport>(`/api/reports/inventory?${query}&lowStockThreshold=${threshold}`, {}, token))
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được báo cáo.')
    } finally {
      setLoading(false)
    }
  }, [token, tab, range, threshold])

  useEffect(() => { void load() }, [load])

  const exportRevenue = () => {
    if (!revenue) return
    downloadCsv(`doanh-thu_${revenue.from}_${revenue.to}.csv`,
      ['Ngày', 'Số đơn giao', 'Doanh thu', 'Hoàn tiền', 'Doanh thu thuần', 'Giá vốn', 'Lợi nhuận gộp', 'SP chưa có giá vốn'],
      revenue.days.map((d) => [d.day, d.orders, d.revenue, d.refunds, d.netRevenue, d.cogs, d.grossProfit, d.uncostedUnits]))
  }

  const exportInventory = () => {
    if (!inventory) return
    downloadCsv(`nhap-xuat-ton_${inventory.from}_${inventory.to}.csv`,
      ['SKU', 'Sản phẩm', 'Tồn đầu', 'Nhập', 'Hàng hoàn nhập lại', 'Xuất bán', 'Điều chỉnh', 'Tồn cuối', 'Còn bán được', 'Giá vốn BQ', 'Giá trị tồn', 'Sắp hết'],
      inventory.lines.map((l) => [l.sku, l.name, l.opening, l.imported, l.returned, l.exported, l.adjusted, l.closing,
        l.availableNow, l.unitCost, l.closingValue, l.lowStock ? 'Có' : '']))
  }

  if (tabs.length === 0) return <p>Bộ phận hiện tại không có báo cáo quản trị.</p>

  return (
    <div>
      <h1 className={a.pageTitle}>Báo cáo quản trị</h1>

      <div className={a.toolbar}>
        <div className={a.filterBar}>
          {tabs.map((t) => (
            <button key={t} type="button" className={chipClass(tab === t)} onClick={() => setTab(t)}>
              {t === 'revenue' ? 'Doanh thu & lợi nhuận' : 'Nhập – xuất – tồn'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-space-sm">
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Từ ngày
            <input type="date" className={a.input} value={range.from} max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
            Đến ngày
            <input type="date" className={a.input} value={range.to} min={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
          </label>
          {tab === 'inventory' && (
            <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface-variant">
              Ngưỡng sắp hết
              <input type="number" min={0} className={`${a.input} w-24`} value={threshold}
                onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))} />
            </label>
          )}
          <button type="button" className={buttonClass('secondary', 'md')} disabled={loading}
            onClick={tab === 'revenue' ? exportRevenue : exportInventory}>
            Xuất Excel (CSV)
          </button>
        </div>
      </div>

      {error && <p className="mb-space-md text-error">{error}</p>}
      {loading && <p className="mb-space-md text-on-surface-variant">Đang tải…</p>}

      {tab === 'revenue' && revenue && <RevenueView report={revenue} />}
      {tab === 'inventory' && inventory && <InventoryView report={inventory} />}
    </div>
  )
}

function RevenueView({ report }: { report: RevenueReport }) {
  const stats = [
    { label: 'Đơn đã giao', value: report.orders.toLocaleString('vi-VN') },
    { label: 'Doanh thu (ghi nhận khi giao)', value: formatVnd(report.revenue) },
    { label: 'Hoàn tiền hàng trả lại', value: formatVnd(report.refunds) },
    { label: 'Doanh thu thuần', value: formatVnd(report.netRevenue) },
    { label: 'Giá vốn hàng bán', value: formatVnd(report.cogs) },
    { label: `Lợi nhuận gộp (biên ${pct(report.marginPct)})`, value: formatVnd(report.grossProfit) },
  ]
  return (
    <>
      <div className={a.statRow}>
        {stats.map((s) => (
          <div key={s.label} className={a.card}>
            <div className={a.statLabel}>{s.label}</div>
            <div className="font-headline-md text-headline-md text-on-surface">{s.value}</div>
          </div>
        ))}
      </div>

      {report.uncostedUnits > 0 && (
        <p className="mb-space-md rounded-lg border border-[#ca8a04] bg-[color-mix(in_srgb,#ca8a04_10%,transparent)] px-space-md py-2 font-body-md text-body-md text-on-surface">
          {report.uncostedUnits.toLocaleString('vi-VN')} sản phẩm đã bán chưa có giá vốn (chưa có phiếu nhập được duyệt kèm đơn giá),
          nên giá vốn và lợi nhuận gộp đang thiếu phần này. Lập và duyệt phiếu nhập để có số liệu đầy đủ.
        </p>
      )}

      <div className={`${a.card} mb-space-lg`}>
        <div className={a.statLabel}>Doanh thu thuần theo ngày (triệu đồng)</div>
        <LineChart values={report.days.map((d) => Math.round(d.netRevenue / 10_000) / 100)}
          labels={report.days.map((d) => dayLabel(d.day))} height={200} />
      </div>

      <h2 className="font-title-lg text-title-lg text-on-surface mb-space-sm">Top 10 sản phẩm theo doanh thu</h2>
      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th><th>Loại</th><th className="!text-right">SL bán</th><th className="!text-right">Doanh thu thuần</th>
              <th className="!text-right">Giá vốn</th><th className="!text-right">Lợi nhuận gộp</th><th className="!text-right">Biên LN</th>
            </tr>
          </thead>
          <tbody>
            {report.topProducts.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-on-surface-variant">Không có đơn nào được giao trong kỳ</td></tr>
            ) : report.topProducts.map((p) => (
              <tr key={p.variantId}>
                <td><div className="font-bold">{p.name}</div><small>{p.sku}</small></td>
                <td>{PRODUCT_TYPE_LABEL[p.productType] ?? p.productType}</td>
                <td className="text-right">{p.units}</td>
                <td className="text-right">{formatVnd(p.revenue)}</td>
                <td className="text-right">{p.cogs == null ? <span className="text-on-surface-variant">Chưa có</span> : formatVnd(p.cogs)}</td>
                <td className="text-right">{p.grossProfit == null ? '—' : formatVnd(p.grossProfit)}</td>
                <td className="text-right">{pct(p.marginPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function InventoryView({ report }: { report: InventoryReport }) {
  return (
    <>
      <div className={a.statRow}>
        <div className={a.card}><div className={a.statLabel}>Số SKU đang quản lý</div><div className={a.statValue}>{report.variants}</div></div>
        <div className={a.card}>
          <div className={a.statLabel}>Sắp hết hàng (còn bán ≤ {report.lowStockThreshold})</div>
          <div className={`${a.statValue} ${report.lowStockVariants > 0 ? '!text-error' : ''}`}>{report.lowStockVariants}</div>
        </div>
        <div className={a.card}>
          <div className={a.statLabel}>Giá trị tồn cuối kỳ (theo giá vốn BQ)</div>
          <div className="font-headline-md text-headline-md text-on-surface">{formatVnd(report.closingValue)}</div>
          {report.uncostedVariants > 0 && <small className="text-on-surface-variant">{report.uncostedVariants} SKU còn tồn nhưng chưa có giá vốn</small>}
        </div>
      </div>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th><th className="!text-right">Tồn đầu</th><th className="!text-right">Nhập</th>
              <th className="!text-right">Hàng hoàn</th><th className="!text-right">Xuất bán</th><th className="!text-right">Điều chỉnh</th>
              <th className="!text-right">Tồn cuối</th><th className="!text-right">Còn bán được</th><th className="!text-right">Giá trị tồn</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.map((l) => (
              <tr key={l.variantId}>
                <td>
                  <div className="font-bold">{l.name}</div>
                  <small>{l.sku}</small>
                  {l.lowStock && <span className="ml-2 rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm text-on-error-container">Sắp hết</span>}
                </td>
                <td className="text-right">{l.opening}</td>
                <td className="text-right">{l.imported}</td>
                <td className="text-right">{l.returned}</td>
                <td className="text-right">{l.exported}</td>
                <td className="text-right">{l.adjusted > 0 ? `+${l.adjusted}` : l.adjusted}</td>
                <td className="text-right font-bold">{l.closing}</td>
                <td className="text-right">{l.availableNow}</td>
                <td className="text-right">{l.closingValue == null ? <span className="text-on-surface-variant">Chưa có giá vốn</span> : formatVnd(l.closingValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-space-sm font-body-md text-body-md text-on-surface-variant">
        Tồn cuối = Tồn đầu + Nhập + Hàng hoàn − Xuất bán ± Điều chỉnh. "Còn bán được" là tồn hiện tại trừ hàng đang giữ cho đơn chưa đóng gói.
      </p>
    </>
  )
}
