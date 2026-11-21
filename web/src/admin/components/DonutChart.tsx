// Minimal inline donut chart via stroke-dasharray segments — no charting
// library, matches the circular-progress pattern seen on dashboard UIs.
export interface DonutSegment {
  label: string
  value: number
  color: string
}

export default function DonutChart({ segments, size = 128, thickness = 16 }: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
}) {
  const rawTotal = segments.reduce((sum, s) => sum + s.value, 0)
  const divisor = rawTotal || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const arcs = segments.reduce<Array<DonutSegment & { dash: number; offset: number; pct: number }>>((acc, s) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0
    const dash = rawTotal === 0 ? 0 : (s.value / divisor) * circumference
    const pct = rawTotal === 0 ? 0 : Math.round((s.value / rawTotal) * 1000) / 10
    acc.push({ ...s, dash, offset: prevOffset, pct })
    return acc
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Tổng ${rawTotal}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--st-line)" strokeWidth={thickness} />
          {arcs.map((a) =>
            a.dash > 0 ? (
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
              >
                <title>{`${a.label}: ${a.value.toLocaleString('vi-VN')} (${a.pct}%)`}</title>
              </circle>
            ) : null,
          )}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill="var(--st-on-surface)">
          {rawTotal.toLocaleString('vi-VN')}
        </text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {arcs.map((s) => (
          <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--st-on-surface-variant)' }}>{s.label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value.toLocaleString('vi-VN')}</strong>
            <span style={{ color: 'var(--st-on-surface-variant)', fontVariantNumeric: 'tabular-nums' }}>({s.pct}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
