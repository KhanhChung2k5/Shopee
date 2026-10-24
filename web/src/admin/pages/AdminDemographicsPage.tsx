import { useEffect, useState } from 'react'
import { age, type Customer } from '../types/customer'
import { useAuth } from '../../state/AuthContext'
import { apiFetch } from '../../lib/api'
import { fetchCustomerReport, type CustomerReport } from '../../lib/crm'
import { a } from '../adminUi'

const AGE_BUCKETS: [string, (a: number) => boolean][] = [
  ['Dưới 18', (a) => a < 18],
  ['18–24', (a) => a >= 18 && a <= 24],
  ['25–34', (a) => a >= 25 && a <= 34],
  ['35+', (a) => a >= 35],
]

function BarChart({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div className="grid grid-cols-[140px_1fr_40px] items-center gap-2.5 font-body-md text-body-md text-on-surface" key={r.label}>
          <span>{r.label}</span>
          <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-right font-bold">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDemographicsPage() {
  const { token } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [report, setReport] = useState<CustomerReport | null>(null)

  useEffect(() => {
    if (!token) return
    apiFetch<Customer[]>('/customers', {}, token).then(setCustomers).catch(() => setCustomers([]))
    // Category / genre preferences come from delivered orders (CRM report, cs + admin).
    fetchCustomerReport(token).then(setReport).catch(() => setReport(null))
  }, [token])

  const activeCustomers = customers.filter((c) => c.status !== 'deleted')

  const ageRows = AGE_BUCKETS.map(([label, test]) => ({
    label,
    count: activeCustomers.filter((c) => {
      const a = age(c.dob)
      return a !== null && test(a)
    }).length,
  }))

  // users.gender stores male / female / other (older rows may hold the Vietnamese label).
  const GENDER_VALUES: [string, string[]][] = [['Nam', ['male', 'nam']], ['Nữ', ['female', 'nữ', 'nu']], ['Khác', ['other', 'khác', 'khac']]]
  const genderRows = GENDER_VALUES.map(([label, values]) => ({
    label,
    count: activeCustomers.filter((c) => values.includes((c.gender ?? '').toLocaleLowerCase('vi'))).length,
  }))
  const unknownGender = activeCustomers.filter((c) => !c.gender).length

  return (
    <div>
      <h1>Báo cáo nhân khẩu học khách hàng</h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-xl">
        Tính trên {activeCustomers.length} khách hàng đang hoạt động/khoá (không tính tài khoản đã xoá mềm). Dữ liệu thật từ{' '}
        <code className="font-mono">GET /customers</code> — tuổi/giới tính có thể trống nếu khách chưa cập nhật hồ sơ.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-lg">
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Phân bố độ tuổi</div>
          <BarChart rows={ageRows} />
        </div>
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Phân bố giới tính</div>
          <BarChart rows={genderRows} />
          {unknownGender > 0 && <p className="font-label-md text-label-md text-on-surface-variant mt-space-sm">{unknownGender} khách chưa khai báo giới tính.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Ngành hàng ưa thích (theo đơn đã giao)</div>
          {report && report.interests.length > 0
            ? <BarChart rows={report.interests.map((i) => ({ label: i.categoryName, count: i.count }))} />
            : <p className="font-body-md text-body-md text-on-surface-variant">{report ? 'Chưa có đơn hàng nào được giao.' : 'Đang tải…'}</p>}
        </div>
        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Thể loại game được mua</div>
          {report && report.genres?.length > 0
            ? <BarChart rows={report.genres.map((g) => ({ label: g.label, count: g.count }))} />
            : <p className="font-body-md text-body-md text-on-surface-variant">{report ? 'Chưa có đĩa game nào được giao.' : 'Đang tải…'}</p>}
        </div>
      </div>
    </div>
  )
}
