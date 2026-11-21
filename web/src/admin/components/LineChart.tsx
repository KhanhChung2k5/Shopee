import { useState } from 'react'

/**
 * Interactive analytics line chart with Y-axis labels, smart X-axis tick thinning
 * (prevents label overlap on 30–365 day ranges), safe 0/1-point handling, and hover tooltip.
 */
export default function LineChart({
  values,
  labels,
  color = 'var(--st-primary)',
  height = 200,
  unit = '',
}: {
  values: number[]
  labels: string[]
  color?: string
  height?: number
  unit?: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (values.length === 0) {
    return <p className="font-body-md text-body-md text-on-surface-variant">Không có dữ liệu trong kỳ.</p>
  }

  const width = 640
  const padding = { top: 18, right: 16, bottom: 28, left: 48 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const rawMax = Math.max(...values, 0)
  const max = rawMax <= 0 ? 1 : rawMax * 1.12
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const xAt = (i: number) =>
    values.length === 1 ? padding.left + chartW / 2 : padding.left + (i / (values.length - 1)) * chartW
  const yAt = (v: number) => padding.top + chartH - ((v - min) / range) * chartH

  const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v), v, label: labels[i] ?? '' }))

  const linePath =
    points.length === 1
      ? `M${padding.left},${points[0].y} L${width - padding.right},${points[0].y}`
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    points.length === 1
      ? ''
      : `${linePath} L${points[points.length - 1].x.toFixed(1)},${padding.top + chartH} L${points[0].x.toFixed(1)},${padding.top + chartH} Z`

  const yTicks = [1, 0.5, 0].map((f) => ({
    val: Math.round((min + range * f) * 10) / 10,
    y: padding.top + chartH * (1 - f),
  }))

  // Thin X-axis labels so at most 8 labels appear cleanly without colliding
  const maxLabels = 8
  const labelStep = values.length <= maxLabels ? 1 : Math.ceil((values.length - 1) / (maxLabels - 1))
  const shownLabelIndexes = new Set<number>()
  for (let i = 0; i < values.length; i += labelStep) shownLabelIndexes.add(i)
  shownLabelIndexes.add(values.length - 1)

  const hovered = hoverIdx != null ? points[hoverIdx] : null

  return (
    <div className="relative">
      {hovered && (
        <div className="mb-1 flex justify-end">
          <span className="rounded-md bg-surface-container-low px-2 py-0.5 font-label-md text-label-md text-on-surface tabular-nums">
            <strong>{hovered.label}</strong>: {hovered.v.toLocaleString('vi-VN')}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height, display: 'block' }}
        role="img"
        aria-label="Biểu đồ đường xu hướng"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t.y}>
            <line x1={padding.left} x2={width - padding.right} y1={t.y} y2={t.y} stroke="var(--st-line)" strokeWidth="1" />
            <text x={padding.left - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--st-on-surface-variant)">
              {t.val.toLocaleString('vi-VN')}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#lc-fill)" />}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padding.top}
            y2={padding.top + chartH}
            stroke="var(--st-outline, #94a3b8)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {points.map((p, i) => {
          const isHot = hoverIdx === i || (hoverIdx == null && i === points.length - 1)
          const hitW = values.length === 1 ? chartW : Math.max(8, chartW / Math.max(1, values.length - 1))
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)}>
              <rect
                x={p.x - hitW / 2}
                y={padding.top}
                width={hitW}
                height={chartH}
                fill="transparent"
                className="cursor-crosshair"
              >
                <title>{`${p.label}: ${p.v.toLocaleString('vi-VN')}${unit ? ` ${unit}` : ''}`}</title>
              </rect>
              {isHot && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoverIdx === i ? 4.5 : 3.5}
                  fill={color}
                  stroke="var(--st-surface-container-lowest, #fff)"
                  strokeWidth="2"
                />
              )}
            </g>
          )
        })}

        {points.map((p, i) =>
          shownLabelIndexes.has(i) ? (
            <text
              key={`lbl-${i}`}
              x={p.x}
              y={height - 6}
              fontSize="11"
              fill="var(--st-on-surface-variant)"
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
