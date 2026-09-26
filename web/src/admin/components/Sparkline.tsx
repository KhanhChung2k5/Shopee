// Minimal inline sparkline — no charting library, matches the "big number +
// mini trend line inside the stat card" pattern seen on dashboard-style UIs.
export default function Sparkline({ values, color = 'var(--color-primary)', width = 120, height = 32 }: {
  values: number[]
  color?: string
  width?: number
  height?: number
}) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)

  const points = values.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill={color} opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  )
}
