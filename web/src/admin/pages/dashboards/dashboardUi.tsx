import { useState, type ReactNode } from 'react'
import { a } from '../../adminUi'

export function Note({ children }: { children: ReactNode }) {
  return <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg max-w-4xl">{children}</p>
}

export function Stats({ items }: { items: { label: string; value: string; hint?: string; tone?: 'up' | 'down' }[] }) {
  return (
    <div className={a.statRow}>
      {items.map((item) => (
        <div key={item.label} className={a.card}>
          <div className={a.statLabel}>{item.label}</div>
          <div className={`${a.statValue} ${item.tone === 'up' ? 'text-emerald-700' : item.tone === 'down' ? 'text-red-600' : ''}`}>{item.value}</div>
          {item.hint && <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{item.hint}</p>}
        </div>
      ))}
    </div>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${a.card} mb-space-lg`}>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-space-md">{title}</h2>
      {children}
    </section>
  )
}

export interface HistogramSegment {
  key: string
  label: string
  count: number
  percent: number | null
}

export interface HistogramRow {
  key: string
  label: string
  value: number
  segments: HistogramSegment[]
}

function formatCount(value: number) {
  return (Number.isInteger(value) ? value : Math.round(value * 10) / 10).toLocaleString('vi-VN')
}

function formatPercent(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN')}%`
}

/** Cột histogram. Rê hoặc focus vào một cột để xem tỷ lệ phân khúc trong khoảng đó. */
export function Histogram({ ariaLabel, rows }: { ariaLabel: string; rows: HistogramRow[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  if (rows.length === 0) return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu trong kỳ.</p>
  const peak = Math.max(0, ...rows.map((row) => row.value))
  const ceiling = axisCeiling(peak)
  const ticks = [ceiling, ceiling / 2, 0]
  const active = rows.find((row) => row.key === activeKey) ?? null
  return (
    <div
      onMouseLeave={() => setActiveKey(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActiveKey(null)
      }}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2">
        <div className="mt-8 flex h-56 flex-col justify-between text-right font-label-md text-label-md text-on-surface-variant" aria-hidden>
          {ticks.map((tick) => <span key={tick}>{formatCount(tick)}</span>)}
        </div>
        <div className="relative mt-8 h-56">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((tick) => <div key={tick} className="border-t border-line" />)}
          </div>
          <div className="absolute inset-0 flex items-end gap-1" role="list" aria-label={ariaLabel}>
            {rows.map((row) => (
              <HistogramColumn
                key={row.key}
                row={row}
                ceiling={ceiling}
                active={row.key === activeKey}
                onActivate={() => setActiveKey(row.key)}
              />
            ))}
          </div>
        </div>
        <div />
        <div className="mt-2 flex gap-1">
          {rows.map((row) => (
            <div key={row.key} className={`min-w-0 flex-1 text-center font-label-md text-label-md leading-tight ${row.key === activeKey ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
              {row.label}
            </div>
          ))}
        </div>
      </div>
      <HistogramDetail row={active} />
    </div>
  )
}

function HistogramColumn({ row, ceiling, active, onActivate }: {
  row: HistogramRow
  ceiling: number
  active: boolean
  onActivate: () => void
}) {
  const height = row.value <= 0 ? '3px' : `${(row.value / ceiling) * 100}%`
  const breakdown = row.segments.length === 0
    ? 'không có lần mua lặp'
    : row.segments.map((segment) => `${segment.label} ${formatPercent(segment.percent)}`).join(', ')
  return (
    <div role="listitem" className="relative h-full min-w-0 flex-1">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
        aria-label={`${row.label}, ${row.value.toLocaleString('vi-VN')} lần. Phân khúc RFM: ${breakdown}`}
        onMouseEnter={onActivate}
        onFocus={onActivate}
      >
        <span
          className={`absolute inset-x-0.5 bottom-0 ${active ? 'bg-primary-container' : 'bg-primary'} ${row.value <= 0 ? 'opacity-35' : ''}`}
          style={{ height }}
        />
        <span className="absolute inset-x-0 text-center font-title-md text-title-md text-on-surface" style={{ bottom: `calc(${height} + 4px)` }}>
          {row.value.toLocaleString('vi-VN')}
        </span>
      </button>
    </div>
  )
}

function HistogramDetail({ row }: { row: HistogramRow | null }) {
  return (
    <div className="mt-space-md min-h-28 rounded-lg border border-line bg-surface-container-low px-space-md py-3" aria-live="polite">
      {row == null ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Rê vào một cột để xem tỷ lệ từng phân khúc RFM trong khoảng đó.</p>
      ) : (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="font-title-md text-title-md text-on-surface">{row.label}</span>
            <span className="font-label-md text-label-md text-on-surface-variant">{row.value.toLocaleString('vi-VN')} lần</span>
          </div>
          <div className="mb-1.5 font-label-md text-label-md text-on-surface-variant">Phân khúc RFM</div>
          {row.segments.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Không có lần mua lặp trong khoảng này.</p>
          ) : (
            <ul className="flex max-w-sm flex-col gap-1">
              {row.segments.map((segment) => (
                <li key={segment.key} className="flex items-baseline justify-between gap-6 font-body-md text-body-md">
                  <span className="text-on-surface">{segment.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-on-surface">{formatPercent(segment.percent)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function HBars({ rows }: { rows: { label: string; value: number; display: string; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  if (rows.length === 0) return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu trong kỳ.</p>
  return (
    <ul className="flex flex-col gap-space-sm">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex justify-between gap-space-md font-body-md text-body-md">
            <span>{row.label}</span>
            <strong>{row.display}</strong>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-container">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: row.color ?? 'var(--st-primary)' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Làm tròn trần trục lên mốc 1–2–5 để các vạch cách đều. */
function axisCeiling(value: number) {
  if (value <= 0) return 1
  const padded = value * 1.12
  const magnitude = 10 ** Math.floor(Math.log10(padded))
  const unit = padded / magnitude
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10
  return step * magnitude
}

function axisMoney(value: number) {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const scaled = abs >= 1_000_000_000 ? [abs / 1_000_000_000, 'tỷ'] : abs >= 1_000_000 ? [abs / 1_000_000, 'tr'] : abs >= 1_000 ? [abs / 1_000, 'nghìn'] : [abs, '']
  const amount = Math.round((scaled[0] as number) * 10) / 10
  const unit = scaled[1] ? ` ${scaled[1]}` : ''
  return `${amount.toLocaleString('vi-VN')}${unit}`
}

/** MoM doanh thu thuần. Tháng trước bằng 0 thì không có tỷ lệ hữu hạn. */
function momChange(current: number, previous: number): { direction: 'up' | 'down'; text: string } | null {
  if (current === previous) return null
  const direction = current > previous ? 'up' : 'down'
  if (previous === 0) return { direction, text: 'mới' }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const abs = Math.abs(pct)
  const rounded = abs >= 10 ? Math.round(abs) : Math.round(abs * 10) / 10
  const sign = direction === 'up' ? '+' : '−'
  return { direction, text: `${sign}${rounded.toLocaleString('vi-VN')}%` }
}

function trianglePoints(x: number, baseline: number, up: boolean) {
  const width = 8
  const height = 7
  const bottom = baseline - 1
  const top = bottom - height
  const mid = x + width / 2
  return up ? `${x},${bottom} ${mid},${top} ${x + width},${bottom}` : `${x},${top} ${x + width},${top} ${mid},${bottom}`
}

/** Đường doanh thu thuần và số thu. Tam giác kèm % MoM của doanh thu thuần. */
export function MonthLines({ months }: { months: { label: string; net: number; collected: number }[] }) {
  if (months.length === 0) return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu trong kỳ.</p>
  const height = 280
  const pad = { top: 36, right: 52, bottom: 36, left: 78 }
  const width = Math.max(640, months.length * 84 + pad.left + pad.right)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const peak = Math.max(0, ...months.flatMap((month) => [month.net, month.collected]))
  const ceiling = axisCeiling(peak)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((step) => ceiling * step)
  const x = (index: number) => pad.left + (months.length === 1 ? innerW / 2 : (index / (months.length - 1)) * innerW)
  const y = (value: number) => pad.top + innerH - (Math.max(0, value) / ceiling) * innerH
  const line = (key: 'net' | 'collected') => months.map((month, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(month[key])}`).join(' ')
  const markers: { index: number; direction: 'up' | 'down'; text: string; color: string; baseline: number; left: number; width: number }[] = []
  months.forEach((month, index) => {
    if (index === 0) return
    const change = momChange(month.net, months[index - 1].net)
    if (!change) return
    const labelWidth = 9 + 4 + change.text.length * 6.5
    const left = x(index) - labelWidth / 2
    let baseline = Math.max(16, y(month.net) - 10)
    for (let guard = 0; guard < 3; guard++) {
      const hitsEarlier = markers.some((prior) => Math.abs(prior.baseline - baseline) < 13 && left < prior.left + prior.width + 6 && left + labelWidth + 6 > prior.left)
      if (!hitsEarlier || baseline - 13 < 14) break
      baseline -= 13
    }
    markers.push({ index, direction: change.direction, text: change.text, color: change.direction === 'up' ? '#15803d' : '#b91c1c', baseline, left, width: labelWidth })
  })

  return (
    <div>
      <div className="flex flex-wrap gap-space-md mb-space-sm font-label-md text-label-md text-on-surface-variant">
        <Legend color="#15803d" label="Thuần sản phẩm" />
        <Legend color="#7c3aed" label="Số thu" />
        <span className="inline-flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <polygon points="5,1 9,9 1,9" fill="#15803d" />
          </svg>
          MoM doanh thu thuần
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block h-auto w-full" style={{ minWidth: width }} role="img" aria-label="Doanh thu thuần và số thu theo tháng">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--st-line, #e7e5e4)" strokeWidth="1" />
              <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#78716c">{axisMoney(tick)}</text>
            </g>
          ))}
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} stroke="#d6d3d1" strokeWidth="1" />
          <path d={line('collected')} fill="none" stroke="#7c3aed" strokeWidth="2" />
          <path d={line('net')} fill="none" stroke="#15803d" strokeWidth="2.5" />
          {months.map((month, index) => {
            const marker = markers.find((item) => item.index === index)
            return (
              <g key={month.label}>
                <circle cx={x(index)} cy={y(month.collected)} r="3.5" fill="#7c3aed">
                  <title>{`Số thu ${month.label}: ${month.collected.toLocaleString('vi-VN')} ₫`}</title>
                </circle>
                <circle cx={x(index)} cy={y(month.net)} r="4" fill="#15803d">
                  <title>{`Doanh thu thuần ${month.label}: ${month.net.toLocaleString('vi-VN')} ₫`}</title>
                </circle>
                {marker && (
                  <g aria-label={`MoM ${month.label}: ${marker.text}`}>
                    <polygon points={trianglePoints(marker.left, marker.baseline, marker.direction === 'up')} fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
                    <polygon points={trianglePoints(marker.left, marker.baseline, marker.direction === 'up')} fill={marker.color} />
                    <text x={marker.left + 12} y={marker.baseline} fontSize="11" fontWeight="600" fill={marker.color} stroke="#fff" strokeWidth="2.5" paintOrder="stroke">
                      {marker.text}
                    </text>
                  </g>
                )}
                <text x={x(index)} y={height - 10} textAnchor="middle" fontSize="12" fill="#78716c">{month.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

export function Status({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">Đang tải số liệu…</p>
  if (error) return <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>
  return null
}
