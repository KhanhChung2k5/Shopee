// Full analytics-style line chart (grid lines, axis labels, filled area,
// end-point dot) — modelled on the "Total Profit" dashboard pattern (big
// number + trend line with axis) rather than a tiny sparkline.
export default function LineChart({
  values,
  labels,
  color = 'var(--color-primary)',
  height = 160,
}: {
  values: number[]
  labels: string[]
  color?: string
  height?: number
}) {
  const width = 600
  const padding = { top: 12, right: 8, bottom: 24, left: 8 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = chartW / (values.length - 1)

  const points = values.map((v, i) => {
    const x = padding.left + i * step
    const y = padding.top + chartH - ((v - min) / range) * chartH
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => padding.top + chartH * f)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((y) => (
        <line key={y} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" />
      ))}
      <path d={areaPath} fill="url(#lc-fill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 0} fill={color} stroke="var(--color-surface)" strokeWidth="2" />
      ))}
      {labels.map((label, i) => (
        <text
          key={label}
          x={padding.left + i * step}
          y={height - 6}
          fontSize="11"
          fill="var(--color-muted-foreground)"
          textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}
    </svg>
  )
}
