import { useMemo, useState, type ReactNode } from 'react'
import { formatVnd } from '../../lib/catalog'
import { a } from '../adminUi'

/** Khung chia 2 cột chuẩn: Biểu đồ bên trái — Bảng số liệu chi tiết kế bên phải. */
export function ChartTableSplit({
  chart,
  table,
  chartRatio = '1.15fr',
}: {
  chart: ReactNode
  table: ReactNode
  chartRatio?: string
}) {
  return (
    <div
      className="grid grid-cols-1 gap-space-lg items-start xl:grid-cols-[var(--split-left)_minmax(0,1fr)]"
      style={{ '--split-left': `minmax(0,${chartRatio})` } as React.CSSProperties}
    >
      <div className="min-w-0">{chart}</div>
      <div className="min-w-0">{table}</div>
    </div>
  )
}

function axisCeiling(value: number) {
  if (value <= 0) return 1
  const padded = value * 1.15
  const magnitude = 10 ** Math.floor(Math.log10(padded))
  const unit = padded / magnitude
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10
  return step * magnitude
}

function axisMoney(value: number) {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(Math.round((abs / 1_000_000_000) * 10) / 10).toLocaleString('vi-VN')} tỷ`
  if (abs >= 1_000_000) return `${(Math.round((abs / 1_000_000) * 10) / 10).toLocaleString('vi-VN')} tr`
  if (abs >= 1_000) return `${Math.round(abs / 1_000).toLocaleString('vi-VN')}k`
  return abs.toLocaleString('vi-VN')
}

export interface CashFlowPoint {
  key: string
  label: string
  income: number
  expense: number
  importExpense: number
  refunds: number
  net: number
}

/** Biểu đồ cột đôi Thu vs Chi kèm tooltip tương tác và đường lưới rõ ràng. */
export function CashFlowBarChart({
  points,
  incomeLabel = 'Thu (bán hàng)',
  expenseLabel = 'Chi (nhập hàng + hoàn)',
  onSelect,
  selectedKey,
}: {
  points: CashFlowPoint[]
  incomeLabel?: string
  expenseLabel?: string
  onSelect?: (point: CashFlowPoint) => void
  selectedKey?: string | null
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  if (points.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu Thu – Chi trong kỳ.</p>
  }

  const height = 270
  const pad = { top: 24, right: 20, bottom: 40, left: 68 }
  const groupW = Math.max(52, Math.min(84, Math.floor(560 / Math.max(1, points.length))))
  const width = Math.max(460, pad.left + pad.right + points.length * groupW)
  const innerH = height - pad.top - pad.bottom
  const peak = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]))
  const ceiling = axisCeiling(peak)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((s) => ceiling * s)
  const y = (v: number) => pad.top + innerH - (Math.max(0, v) / ceiling) * innerH
  const barW = Math.max(10, Math.min(22, Math.floor((groupW - 14) / 2)))
  const hovered = hoverIdx == null ? null : points[hoverIdx]

  return (
    <div>
      <div className="mb-space-sm flex flex-wrap items-center justify-between gap-2 font-label-md text-label-md text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#16a34a]" />
            {incomeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#dc2626]" />
            {expenseLabel}
          </span>
        </div>
        {hovered && (
          <span className="rounded-md bg-surface-container-low px-2 py-0.5 font-body-sm text-body-sm text-on-surface tabular-nums">
            <strong>{hovered.label}</strong>: Thu {formatVnd(hovered.income)} · Chi {formatVnd(hovered.expense)} · Ròng{' '}
            <strong className={hovered.net >= 0 ? 'text-emerald-700' : 'text-red-600'}>
              {hovered.net >= 0 ? '+' : ''}
              {formatVnd(hovered.net)}
            </strong>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block h-auto w-full"
          style={{ minWidth: Math.min(width, 460) }}
          role="img"
          aria-label="Biểu đồ so sánh Thu và Chi"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--st-line, #e7e5e4)"
                strokeWidth="1"
              />
              <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#78716c">
                {axisMoney(tick)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} stroke="#d6d3d1" strokeWidth="1" />

          {points.map((pt, i) => {
            const cx = pad.left + i * groupW + groupW / 2
            const incH = (Math.max(0, pt.income) / ceiling) * innerH
            const expH = (Math.max(0, pt.expense) / ceiling) * innerH
            const active = hoverIdx === i || selectedKey === pt.key
            return (
              <g
                key={pt.key}
                className={onSelect ? 'cursor-pointer' : undefined}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => onSelect?.(pt)}
              >
                {active && (
                  <rect
                    x={pad.left + i * groupW + 2}
                    y={pad.top}
                    width={groupW - 4}
                    height={innerH}
                    rx="4"
                    fill="rgba(59, 158, 255, 0.08)"
                  />
                )}
                <rect
                  x={cx - barW - 2}
                  y={pad.top + innerH - incH}
                  width={barW}
                  height={Math.max(pt.income > 0 ? 2 : 0, incH)}
                  rx="3"
                  fill="#16a34a"
                >
                  <title>{`${pt.label} · Thu: ${formatVnd(pt.income)}`}</title>
                </rect>
                <rect
                  x={cx + 2}
                  y={pad.top + innerH - expH}
                  width={barW}
                  height={Math.max(pt.expense > 0 ? 2 : 0, expH)}
                  rx="3"
                  fill="#dc2626"
                >
                  <title>{`${pt.label} · Chi: ${formatVnd(pt.expense)} (Nhập ${formatVnd(pt.importExpense)} · Hoàn ${formatVnd(pt.refunds)})`}</title>
                </rect>
                <text
                  x={cx}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={active ? '700' : '500'}
                  fill={active ? '#0f172a' : '#78716c'}
                >
                  {pt.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export type DrillGrain = 'quarter' | 'month' | 'week'

export interface CategoryDayInput {
  day: string
  categoryId: string
  categoryName: string
  revenue: number
  orders: number
  units: number
}

const CAT_COLORS = ['#0284c7', '#16a34a', '#7c3aed', '#ea580c', '#ca8a04', '#0d9488', '#db2777', '#4f46e5', '#64748b']

function parseDayParts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function quarterOfMonth(m: number) {
  return Math.floor((m - 1) / 3) + 1
}

function weekOfMonth(d: number) {
  return Math.min(5, Math.floor((d - 1) / 7) + 1)
}

interface PeriodBucket {
  key: string
  label: string
  subLabel?: string
  revenue: number
  orders: number
  units: number
}

/**
 * Thống kê doanh thu theo danh mục có Drilldown trực tiếp:
 * Quý (Q1–Q4) → Tháng (T1–T12) → Tuần (Tuần 1–5), kèm Biểu đồ bên trái & Bảng chi tiết kế bên.
 */
export function CategoryDrilldownPanel({
  title = 'Doanh thu theo danh mục (Drilldown Quý → Tháng → Tuần)',
  days,
}: {
  title?: string
  days: CategoryDayInput[]
}) {
  const [grain, setGrain] = useState<DrillGrain>('quarter')
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null) // e.g. "2026-Q2"
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null) // e.g. "2026-04"
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null) // e.g. "2026-04-W2"

  // Lọc dữ liệu theo phạm vi drilldown hiện tại
  const scopedDays = useMemo(() => {
    return days.filter((row) => {
      const { year, month, day } = parseDayParts(row.day)
      const qKey = `${year}-Q${quarterOfMonth(month)}`
      const mKey = `${year}-${String(month).padStart(2, '0')}`
      const wKey = `${mKey}-W${weekOfMonth(day)}`
      if (selectedWeek) return wKey === selectedWeek
      if (selectedMonth) return mKey === selectedMonth
      if (selectedQuarter) return qKey === selectedQuarter
      return true
    })
  }, [days, selectedQuarter, selectedMonth, selectedWeek])

  // Các mốc thời gian có thể bấm để drilldown ở cấp hiện tại
  const periods = useMemo<PeriodBucket[]>(() => {
    const map = new Map<string, PeriodBucket>()
    const source = selectedWeek
      ? days.filter((r) => {
          const { year, month } = parseDayParts(r.day)
          return `${year}-${String(month).padStart(2, '0')}` === selectedMonth
        })
      : selectedMonth
        ? days.filter((r) => {
            const { year, month } = parseDayParts(r.day)
            return `${year}-${String(month).padStart(2, '0')}` === selectedMonth
          })
        : selectedQuarter
          ? days.filter((r) => {
              const { year, month } = parseDayParts(r.day)
              return `${year}-Q${quarterOfMonth(month)}` === selectedQuarter
            })
          : days

    for (const row of source) {
      const { year, month, day } = parseDayParts(row.day)
      let key: string
      let label: string
      if (grain === 'quarter') {
        const q = quarterOfMonth(month)
        key = `${year}-Q${q}`
        label = `Q${q}/${year}`
      } else if (grain === 'month') {
        key = `${year}-${String(month).padStart(2, '0')}`
        label = `T${month}/${String(year).slice(2)}`
      } else {
        const w = weekOfMonth(day)
        const mKey = `${year}-${String(month).padStart(2, '0')}`
        key = `${mKey}-W${w}`
        label = `Tuần ${w} (T${month})`
      }
      const prev = map.get(key) ?? { key, label, revenue: 0, orders: 0, units: 0 }
      prev.revenue += row.revenue
      prev.orders += row.orders
      prev.units += row.units
      map.set(key, prev)
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [days, grain, selectedQuarter, selectedMonth, selectedWeek])

  // Tổng hợp theo từng danh mục trong phạm vi hiện tại
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; revenue: number; orders: number; units: number }>()
    for (const row of scopedDays) {
      const prev = map.get(row.categoryId) ?? { id: row.categoryId, name: row.categoryName, revenue: 0, orders: 0, units: 0 }
      prev.revenue += row.revenue
      prev.orders += row.orders
      prev.units += row.units
      map.set(row.categoryId, prev)
    }
    const list = [...map.values()].sort((a, b) => b.revenue - a.revenue)
    const totalRev = list.reduce((s, c) => s + c.revenue, 0)
    return {
      list: list.map((c, idx) => ({
        ...c,
        aov: c.orders > 0 ? Math.round(c.revenue / c.orders) : 0,
        sharePct: totalRev > 0 ? Math.round((c.revenue / totalRev) * 1000) / 10 : 0,
        color: CAT_COLORS[idx % CAT_COLORS.length],
      })),
      totalRev,
      totalOrders: list.reduce((s, c) => s + c.orders, 0),
      totalUnits: list.reduce((s, c) => s + c.units, 0),
    }
  }, [scopedDays])

  const handleGrainSwitch = (next: DrillGrain) => {
    setGrain(next)
    if (next === 'quarter') {
      setSelectedQuarter(null)
      setSelectedMonth(null)
      setSelectedWeek(null)
    } else if (next === 'month') {
      setSelectedMonth(null)
      setSelectedWeek(null)
    } else {
      setSelectedWeek(null)
    }
  }

  const handlePeriodClick = (bucket: PeriodBucket) => {
    if (grain === 'quarter') {
      setSelectedQuarter(bucket.key)
      setSelectedMonth(null)
      setSelectedWeek(null)
      setGrain('month')
    } else if (grain === 'month') {
      setSelectedMonth(bucket.key)
      setSelectedWeek(null)
      setGrain('week')
    } else {
      setSelectedWeek((prev) => (prev === bucket.key ? null : bucket.key))
    }
  }

  const resetAll = () => {
    setGrain('quarter')
    setSelectedQuarter(null)
    setSelectedMonth(null)
    setSelectedWeek(null)
  }

  const maxPeriodRev = Math.max(1, ...periods.map((p) => p.revenue))
  const maxCatRev = Math.max(1, ...categories.list.map((c) => c.revenue))

  return (
    <section className={`${a.card} mb-space-lg`}>
      <div className="mb-space-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            Bấm vào một <strong>Quý</strong> để xem các <strong>Tháng</strong> bên trong, bấm tiếp vào <strong>Tháng</strong> để khoan sâu xuống từng <strong>Tuần</strong>.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface-container-low p-0.5">
          {([
            ['quarter', 'Theo Quý'],
            ['month', 'Theo Tháng'],
            ['week', 'Theo Tuần'],
          ] as const).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => handleGrainSwitch(g)}
              className={`rounded-md px-3 py-1.5 font-label-md text-label-md transition-colors cursor-pointer ${
                grain === g
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb Drilldown */}
      <div className="mb-space-md flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 font-label-md text-label-md">
        <button
          type="button"
          onClick={resetAll}
          className={`cursor-pointer rounded px-1.5 py-0.5 hover:underline ${!selectedQuarter && !selectedMonth && !selectedWeek ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
        >
          Toàn kỳ báo cáo
        </button>
        {selectedQuarter && (
          <>
            <span className="text-on-surface-variant">/</span>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(null)
                setSelectedWeek(null)
                setGrain('month')
              }}
              className={`cursor-pointer rounded px-1.5 py-0.5 hover:underline ${!selectedMonth ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
            >
              {selectedQuarter.replace('-', ' ')}
            </button>
          </>
        )}
        {selectedMonth && (
          <>
            <span className="text-on-surface-variant">/</span>
            <button
              type="button"
              onClick={() => {
                setSelectedWeek(null)
                setGrain('week')
              }}
              className={`cursor-pointer rounded px-1.5 py-0.5 hover:underline ${!selectedWeek ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
            >
              Tháng {Number(selectedMonth.split('-')[1])}/{selectedMonth.split('-')[0]}
            </button>
          </>
        )}
        {selectedWeek && (
          <>
            <span className="text-on-surface-variant">/</span>
            <span className="font-bold text-primary">
              Tuần {selectedWeek.split('-W')[1]}
            </span>
          </>
        )}
        {(selectedQuarter || selectedMonth || selectedWeek) && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto cursor-pointer text-xs text-on-surface-variant underline hover:text-on-surface"
          >
            Xem lại toàn kỳ
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Chưa có dữ liệu doanh thu theo danh mục trong khoảng thời gian này.</p>
      ) : (
        <ChartTableSplit
          chart={
            <div className="flex flex-col gap-space-md">
              {/* Cột thời gian để click drilldown */}
              <div className="rounded-xl border border-line bg-surface-container-lowest p-3">
                <div className="mb-2 flex items-center justify-between font-label-md text-label-md text-on-surface-variant">
                  <span>
                    {grain === 'quarter'
                      ? 'Chọn Quý để drilldown xuống Tháng'
                      : grain === 'month'
                        ? 'Chọn Tháng để drilldown xuống Tuần'
                        : 'Chọn Tuần để lọc chi tiết danh mục'}
                  </span>
                  <span>{periods.length} mốc</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {periods.map((p) => {
                    const isPicked = selectedWeek === p.key || selectedMonth === p.key || selectedQuarter === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handlePeriodClick(p)}
                        className={`group flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                          isPicked
                            ? 'border-primary bg-[color-mix(in_srgb,var(--st-primary)_10%,transparent)]'
                            : 'border-line bg-surface-container-low/50 hover:border-primary/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-title-sm text-title-sm text-on-surface">{p.label}</span>
                          <span className="text-[11px] text-primary opacity-75 group-hover:opacity-100">
                            {grain === 'week' ? (isPicked ? '✓' : 'Lọc') : '↳'}
                          </span>
                        </div>
                        <div className="font-label-md text-label-md font-semibold tabular-nums text-on-surface">
                          {formatVnd(p.revenue)}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-container">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.max(4, (p.revenue / maxPeriodRev) * 100)}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Biểu đồ thanh ngang theo danh mục */}
              <div>
                <div className="mb-2 font-label-md text-label-md text-on-surface-variant">
                  Tỷ trọng doanh thu theo danh mục ({categories.list.length} danh mục)
                </div>
                {categories.list.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">Không có doanh thu ở mốc này.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {categories.list.map((cat) => (
                      <li key={cat.id}>
                        <div className="flex items-baseline justify-between gap-3 font-body-md text-body-md">
                          <span className="inline-flex items-center gap-2 font-medium text-on-surface">
                            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-on-surface">
                            {formatVnd(cat.revenue)}{' '}
                            <span className="font-normal text-on-surface-variant">({cat.sharePct}%)</span>
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 rounded-full bg-surface-container">
                          <div
                            className="h-2.5 rounded-full transition-all"
                            style={{ width: `${Math.max(2, (cat.revenue / maxCatRev) * 100)}%`, background: cat.color }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          }
          table={
            <div className={a.tableWrap}>
              <table className={a.tableCompact}>
                <thead>
                  <tr>
                    <th>Danh mục</th>
                    <th className="!text-right">Đơn</th>
                    <th className="!text-right">SL</th>
                    <th className="!text-right">Doanh thu</th>
                    <th className="!text-right">Tỷ trọng</th>
                    <th className="!text-right">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.list.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-on-surface-variant">
                        Không có dữ liệu ở kỳ đang chọn.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {categories.list.map((cat) => (
                        <tr key={cat.id}>
                          <td>
                            <span className="inline-flex items-center gap-2 font-medium">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ background: cat.color }} />
                              {cat.name}
                            </span>
                          </td>
                          <td className="text-right tabular-nums">{cat.orders.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums">{cat.units.toLocaleString('vi-VN')}</td>
                          <td className="text-right tabular-nums font-semibold">{formatVnd(cat.revenue)}</td>
                          <td className="text-right tabular-nums">{cat.sharePct.toLocaleString('vi-VN')}%</td>
                          <td className="text-right tabular-nums">{formatVnd(cat.aov)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-line bg-surface-container-low/60 font-bold">
                        <td>Tổng cộng</td>
                        <td className="text-right tabular-nums">{categories.totalOrders.toLocaleString('vi-VN')}</td>
                        <td className="text-right tabular-nums">{categories.totalUnits.toLocaleString('vi-VN')}</td>
                        <td className="text-right tabular-nums">{formatVnd(categories.totalRev)}</td>
                        <td className="text-right tabular-nums">100%</td>
                        <td className="text-right tabular-nums">
                          {categories.totalOrders > 0 ? formatVnd(Math.round(categories.totalRev / categories.totalOrders)) : '—'}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          }
        />
      )}
    </section>
  )
}
