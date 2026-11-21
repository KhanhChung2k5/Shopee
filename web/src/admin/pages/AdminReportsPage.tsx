import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { buttonClass } from '../../components/ui'
import LineChart from '../components/LineChart'
import {
  CashFlowBarChart,
  CategoryDrilldownPanel,
  ChartTableSplit,
  type CashFlowPoint,
} from '../components/AnalyticsWidgets'
import { a, chipClass } from '../adminUi'
import { canSeeInventoryReport, canSeeRevenueReport, type Department } from '../access'
import { downloadCsv, isoDay, type InventoryReport, type RevenueDay, type RevenueReport } from '../reports'

type Tab = 'revenue' | 'inventory'
type CashGrain = 'quarter' | 'month' | 'week' | 'day'

const PRODUCT_TYPE_LABEL: Record<string, string> = { game_disc: 'Đĩa game', controller: 'Tay cầm', accessory: 'Phụ kiện' }

const pct = (value: number | null) => (value == null ? '—' : `${value.toLocaleString('vi-VN')}%`)
const dayLabel = (day: string) => { const [, m, d] = day.split('-'); return `${Number(d)}/${Number(m)}` }

/** First day of the current quarter or last 90 days → today so Thu-Chi & drilldown have rich data immediately. */
function defaultRange() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  return { from: isoDay(from), to: isoDay(today) }
}

function aggregateCashFlow(days: RevenueDay[], grain: CashGrain): CashFlowPoint[] {
  const map = new Map<string, CashFlowPoint>()
  for (const row of days) {
    const [y, m, d] = row.day.split('-').map(Number)
    let key: string
    let label: string
    if (grain === 'quarter') {
      const q = Math.floor((m - 1) / 3) + 1
      key = `${y}-Q${q}`
      label = `Q${q}/${y}`
    } else if (grain === 'month') {
      key = `${y}-${String(m).padStart(2, '0')}`
      label = `T${m}/${String(y).slice(2)}`
    } else if (grain === 'week') {
      const w = Math.min(5, Math.floor((d - 1) / 7) + 1)
      key = `${y}-${String(m).padStart(2, '0')}-W${w}`
      label = `W${w}/T${m}`
    } else {
      key = row.day
      label = dayLabel(row.day)
    }
    const prev = map.get(key) ?? { key, label, income: 0, expense: 0, importExpense: 0, refunds: 0, net: 0 }
    prev.income += row.revenue
    prev.importExpense += row.importExpense ?? 0
    prev.refunds += row.refunds
    prev.expense = prev.importExpense + prev.refunds
    prev.net = prev.income - prev.expense
    map.set(key, prev)
  }
  const all = [...map.values()].sort((x, y) => x.key.localeCompare(y.key))
  // For daily view with many zero days, keep active days or last 31 days so chart stays legible
  if (grain === 'day' && all.length > 31) {
    const active = all.filter((p) => p.income > 0 || p.expense > 0)
    return active.length > 0 ? active.slice(-31) : all.slice(-31)
  }
  return all
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
    downloadCsv(`doanh-thu-thu-chi_${revenue.from}_${revenue.to}.csv`,
      ['Ngày', 'Số đơn giao', 'Thu (Doanh thu)', 'Chi nhập hàng', 'Hoàn tiền', 'Dòng tiền ròng', 'Doanh thu thuần', 'Giá vốn', 'Lợi nhuận gộp', 'SP chưa có giá vốn'],
      revenue.days.map((d) => [
        d.day, d.orders, d.revenue, d.importExpense ?? 0, d.refunds, d.netCashFlow ?? (d.revenue - (d.importExpense ?? 0) - d.refunds),
        d.netRevenue, d.cogs, d.grossProfit, d.uncostedUnits,
      ]))
  }

  const exportInventory = () => {
    if (!inventory) return
    downloadCsv(`nhap-xuat-ton_${inventory.from}_${inventory.to}.csv`,
      ['SKU', 'Sản phẩm', 'Tồn đầu', 'Nhập', 'Hàng hoàn nhập lại', 'Xuất bán', 'Điều chỉnh', 'Tồn cuối', 'Còn bán được', 'Giá vốn BQ', 'Giá trị tồn', 'Sắp hết'],
      inventory.lines.map((l) => [l.sku, l.name, l.opening, l.imported, l.returned, l.exported, l.adjusted, l.closing,
        l.availableNow, l.unitCost, l.closingValue, l.lowStock ? 'Có' : '']))
  }

  const applyPreset = (kind: '7d' | 'month' | 'quarter' | 'year') => {
    const today = new Date()
    let fromDate: Date
    if (kind === '7d') {
      fromDate = new Date(today.getTime() - 6 * 86_400_000)
    } else if (kind === 'month') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
    } else if (kind === 'quarter') {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3
      fromDate = new Date(today.getFullYear(), qStartMonth, 1)
    } else {
      fromDate = new Date(today.getFullYear(), 0, 1)
    }
    setRange({ from: isoDay(fromDate), to: isoDay(today) })
  }

  if (tabs.length === 0) return <p>Bộ phận hiện tại không có báo cáo quản trị.</p>

  return (
    <div>
      <h1 className={a.pageTitle}>Báo cáo quản trị</h1>

      <div className={a.toolbar}>
        <div className={a.filterBar}>
          {tabs.map((t) => (
            <button key={t} type="button" className={chipClass(tab === t)} onClick={() => setTab(t)}>
              {t === 'revenue' ? 'Thu – Chi, Doanh thu & Lợi nhuận' : 'Nhập – xuất – tồn'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-space-sm">
          <div className="flex items-center gap-1 self-end pb-0.5">
            {([
              ['7d', '7 ngày'],
              ['month', 'Tháng này'],
              ['quarter', 'Quý này'],
              ['year', 'Năm nay'],
            ] as const).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => applyPreset(k)}
                className="rounded-md border border-line bg-surface-container-low px-2.5 py-1.5 font-label-md text-label-md text-on-surface-variant hover:border-primary hover:text-on-surface cursor-pointer"
              >
                {lbl}
              </button>
            ))}
          </div>
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
  const [cashGrain, setCashGrain] = useState<CashGrain>('month')
  const importExpense = report.importExpense ?? 0
  const totalExpense = report.totalExpense ?? (importExpense + report.refunds)
  const netCashFlow = report.netCashFlow ?? (report.revenue - totalExpense)

  const cashPoints = useMemo(() => aggregateCashFlow(report.days, cashGrain), [report.days, cashGrain])
  const activeDays = useMemo(
    () => report.days.filter((d) => d.orders > 0 || d.revenue > 0 || d.refunds > 0 || (d.importExpense ?? 0) > 0),
    [report.days],
  )

  const stats = [
    { label: 'Đơn đã giao', value: report.orders.toLocaleString('vi-VN'), hint: `Doanh thu thuần ${formatVnd(report.netRevenue)}` },
    { label: 'Tổng Thu (bán hàng)', value: formatVnd(report.revenue), hint: 'Ghi nhận theo ngày giao thành công', tone: 'up' as const },
    {
      label: 'Tổng Chi (nhập + hoàn)',
      value: formatVnd(totalExpense),
      hint: `Nhập hàng ${formatVnd(importExpense)} · Hoàn ${formatVnd(report.refunds)}`,
      tone: 'down' as const,
    },
    {
      label: 'Dòng tiền ròng (Thu − Chi)',
      value: `${netCashFlow >= 0 ? '+' : ''}${formatVnd(netCashFlow)}`,
      hint: netCashFlow >= 0 ? 'Thu lớn hơn Chi trong kỳ' : 'Chi nhập hàng/hoàn đang cao hơn Thu',
      tone: netCashFlow >= 0 ? ('up' as const) : ('down' as const),
    },
    { label: 'Giá vốn hàng bán (COGS)', value: formatVnd(report.cogs), hint: 'Bình quân gia quyền từ phiếu nhập duyệt' },
    { label: `Lợi nhuận gộp (biên ${pct(report.marginPct)})`, value: formatVnd(report.grossProfit), hint: 'Doanh thu thuần − Giá vốn' },
  ]

  return (
    <>
      <div className={a.statRow}>
        {stats.map((s) => (
          <div key={s.label} className={a.card}>
            <div className={a.statLabel}>{s.label}</div>
            <div className={`font-headline-md text-headline-md tabular-nums ${s.tone === 'up' ? 'text-emerald-700' : s.tone === 'down' ? 'text-red-600' : 'text-on-surface'}`}>
              {s.value}
            </div>
            {s.hint && <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{s.hint}</p>}
          </div>
        ))}
      </div>

      {report.uncostedUnits > 0 && (
        <p className="mb-space-md rounded-lg border border-[#ca8a04] bg-[color-mix(in_srgb,#ca8a04_10%,transparent)] px-space-md py-2 font-body-md text-body-md text-on-surface">
          {report.uncostedUnits.toLocaleString('vi-VN')} sản phẩm đã bán chưa có giá vốn (chưa có phiếu nhập được duyệt kèm đơn giá),
          nên giá vốn và lợi nhuận gộp đang thiếu phần này. Lập và duyệt phiếu nhập để có số liệu đầy đủ.
        </p>
      )}

      {/* 1. Thu vs Chi: Chart + Table kế bên */}
      <section className={`${a.card} mb-space-lg`}>
        <div className="mb-space-md flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">So sánh Thu vs Chi</h2>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Thu = Doanh thu đơn giao thành công · Chi = Phiếu nhập hàng đã duyệt + Hoàn tiền trả hàng.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-surface-container-low p-0.5">
            {([
              ['quarter', 'Quý'],
              ['month', 'Tháng'],
              ['week', 'Tuần'],
              ['day', 'Ngày'],
            ] as const).map(([g, label]) => (
              <button
                key={g}
                type="button"
                onClick={() => setCashGrain(g)}
                className={`rounded-md px-3 py-1 font-label-md text-label-md cursor-pointer ${
                  cashGrain === g ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ChartTableSplit
          chart={<CashFlowBarChart points={cashPoints} />}
          table={
            <div className={`${a.tableWrap} max-h-80 overflow-y-auto`}>
              <table className={a.tableCompact}>
                <thead className="sticky top-0 bg-surface-container-lowest z-10">
                  <tr>
                    <th>Kỳ</th>
                    <th className="!text-right">Thu</th>
                    <th className="!text-right">Chi nhập</th>
                    <th className="!text-right">Hoàn tiền</th>
                    <th className="!text-right">Thu − Chi</th>
                  </tr>
                </thead>
                <tbody>
                  {cashPoints.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-on-surface-variant">Không có dữ liệu.</td></tr>
                  ) : (
                    <>
                      {cashPoints.map((pt) => (
                        <tr key={pt.key}>
                          <td className="font-medium">{pt.label}</td>
                          <td className="text-right tabular-nums text-emerald-700 font-medium">{formatVnd(pt.income)}</td>
                          <td className="text-right tabular-nums text-red-600">{formatVnd(pt.importExpense)}</td>
                          <td className="text-right tabular-nums text-on-surface-variant">{formatVnd(pt.refunds)}</td>
                          <td className={`text-right tabular-nums font-semibold ${pt.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {pt.net >= 0 ? '+' : ''}{formatVnd(pt.net)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-line bg-surface-container-low/60 font-bold">
                        <td>Tổng kỳ</td>
                        <td className="text-right tabular-nums text-emerald-700">{formatVnd(report.revenue)}</td>
                        <td className="text-right tabular-nums text-red-600">{formatVnd(importExpense)}</td>
                        <td className="text-right tabular-nums">{formatVnd(report.refunds)}</td>
                        <td className={`text-right tabular-nums ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {netCashFlow >= 0 ? '+' : ''}{formatVnd(netCashFlow)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          }
        />
      </section>

      {/* 2. Doanh thu thuần theo ngày: LineChart + Table kế bên */}
      <section className={`${a.card} mb-space-lg`}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-space-md">
          Xu hướng doanh thu thuần & lợi nhuận gộp theo ngày
        </h2>
        <ChartTableSplit
          chart={
            <div>
              <div className={a.statLabel}>Doanh thu thuần theo ngày (triệu đồng)</div>
              <LineChart
                values={report.days.map((d) => Math.round(d.netRevenue / 10_000) / 100)}
                labels={report.days.map((d) => dayLabel(d.day))}
                height={220}
                unit="triệu ₫"
              />
            </div>
          }
          table={
            <div className={`${a.tableWrap} max-h-72 overflow-y-auto`}>
              <table className={a.tableCompact}>
                <thead className="sticky top-0 bg-surface-container-lowest z-10">
                  <tr>
                    <th>Ngày</th>
                    <th className="!text-right">Đơn</th>
                    <th className="!text-right">DT thuần</th>
                    <th className="!text-right">Giá vốn</th>
                    <th className="!text-right">LN gộp</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDays.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-on-surface-variant">Chưa có phát sinh trong kỳ.</td></tr>
                  ) : activeDays.map((d) => (
                    <tr key={d.day}>
                      <td className="font-medium tabular-nums">{dayLabel(d.day)}</td>
                      <td className="text-right tabular-nums">{d.orders}</td>
                      <td className="text-right tabular-nums font-medium">{formatVnd(d.netRevenue)}</td>
                      <td className="text-right tabular-nums text-on-surface-variant">{formatVnd(d.cogs)}</td>
                      <td className={`text-right tabular-nums font-semibold ${d.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatVnd(d.grossProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />
      </section>

      {/* 3. Doanh thu theo danh mục (Drilldown Quý -> Tháng -> Tuần) + Table kế bên */}
      <CategoryDrilldownPanel
        title="Doanh thu theo từng danh mục (Drilldown Quý → Tháng → Tuần)"
        days={report.categoryDays ?? []}
      />

      {/* 4. Top 10 sản phẩm */}
      <section className={`${a.card} mb-space-lg`}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-space-md">Top 10 sản phẩm theo doanh thu</h2>
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
                  <td className="text-right tabular-nums">{p.units}</td>
                  <td className="text-right tabular-nums font-semibold">{formatVnd(p.revenue)}</td>
                  <td className="text-right tabular-nums">{p.cogs == null ? <span className="text-on-surface-variant">Chưa có</span> : formatVnd(p.cogs)}</td>
                  <td className="text-right tabular-nums font-medium">{p.grossProfit == null ? '—' : formatVnd(p.grossProfit)}</td>
                  <td className="text-right tabular-nums">{pct(p.marginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
                <td className="text-right tabular-nums">{l.opening}</td>
                <td className="text-right tabular-nums">{l.imported}</td>
                <td className="text-right tabular-nums">{l.returned}</td>
                <td className="text-right tabular-nums">{l.exported}</td>
                <td className="text-right tabular-nums">{l.adjusted > 0 ? `+${l.adjusted}` : l.adjusted}</td>
                <td className="text-right tabular-nums font-bold">{l.closing}</td>
                <td className="text-right tabular-nums">{l.availableNow}</td>
                <td className="text-right tabular-nums">{l.closingValue == null ? <span className="text-on-surface-variant">Chưa có giá vốn</span> : formatVnd(l.closingValue)}</td>
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
