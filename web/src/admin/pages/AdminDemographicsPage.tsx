import { INITIAL_CUSTOMERS, age } from '../data/sampleCustomers'

const AGE_BUCKETS: [string, (a: number) => boolean][] = [
  ['Dưới 18', (a) => a < 18],
  ['18–24', (a) => a >= 18 && a <= 24],
  ['25–34', (a) => a >= 25 && a <= 34],
  ['35+', (a) => a >= 35],
]

function BarChart({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="admin-bar-chart">
      {rows.map((r) => (
        <div className="admin-bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="admin-bar-track">
            <div className="admin-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span>{r.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDemographicsPage() {
  const activeCustomers = INITIAL_CUSTOMERS.filter((c) => c.status !== 'deleted')

  const ageRows = AGE_BUCKETS.map(([label, test]) => ({
    label,
    count: activeCustomers.filter((c) => test(age(c.dob))).length,
  }))

  const genderRows = ['Nam', 'Nữ', 'Khác'].map((g) => ({
    label: g,
    count: activeCustomers.filter((c) => c.gender === g).length,
  }))

  const categoryMap = new Map<string, number>()
  activeCustomers.forEach((c) => categoryMap.set(c.favoriteCategory, (categoryMap.get(c.favoriteCategory) ?? 0) + 1))
  const categoryRows = Array.from(categoryMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <h1>Báo cáo nhân khẩu học khách hàng</h1>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginBottom: 'var(--space-5)' }}>
        Tính trên {activeCustomers.length} khách hàng đang hoạt động/khoá (không tính tài khoản đã xoá mềm).
      </p>

      <div className="admin-stat-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Phân bố độ tuổi</div>
          <BarChart rows={ageRows} />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Phân bố giới tính</div>
          <BarChart rows={genderRows} />
        </div>
      </div>

      <div className="admin-stat-card">
        <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Ngành hàng ưa thích (suy ra từ lịch sử mua hàng)</div>
        <BarChart rows={categoryRows} />
      </div>
    </div>
  )
}
