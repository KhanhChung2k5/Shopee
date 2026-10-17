// Minimal inline donut chart via stroke-dasharray segments — no charting
// library, matches the circular-progress pattern seen on dashboard UIs.
export interface DonutSegment {
  label: string
  value: number
  color: string
}

export default function DonutChart({ segments, size = 120, thickness = 16 }: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const arcs = segments.reduce<Array<DonutSegment & { dash: number; offset: number }>>((acc, s) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0
    const dash = (s.value / total) * circumference
    acc.push({ ...s, dash, offset: prevOffset })
    return acc
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="800" fill="var(--color-foreground)">
          {total}
        </text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s) => (
          <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-muted-foreground)' }}>{s.label}</span>
            <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
