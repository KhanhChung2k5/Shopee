import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Customer } from '../types/customer'
import { INITIAL_ORDERS, ORDER_STATUS_LABEL, type OrderStatus } from '../data/sampleOrders'
import { formatVnd } from '../../data/sampleProducts'
import { useAuth } from '../../state/AuthContext'
import { apiFetch } from '../../lib/api'
import LineChart from '../components/LineChart'
import DonutChart from '../components/DonutChart'
import { a } from '../adminUi'
import { canAccessSection, type Department } from '../access'

// Mock 7-period LTV trend — stands in for a real time-series query (needs the Order module).
const LTV_TREND = [38, 42, 39, 47, 52, 49, 61.84]
const LTV_LABELS = ['13/9', '14/9', '15/9', '16/9', '17/9', '18/9', '19/9']
const LTV_DELTA_PCT = 12.4

const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#EAB308',
  confirmed: '#38BDF8',
  shipping: '#0EA5E9',
  delivered: '#16A34A',
  cancelled: '#DC2626',
}

const QUICK_LINKS = [
  { to: '/admin/khach-hang', title: 'Quản lý khách hàng', hint: 'Thêm mới, khoá/mở, xoá mềm tài khoản' },
  { to: '/admin/bao-cao', title: 'Báo cáo nhân khẩu học', hint: 'Phân bố tuổi, giới tính, ngành hàng ưa thích' },
  { to: '/admin/san-pham', title: 'Sản phẩm', hint: 'Danh sách catalog, trạng thái đang bán/ẩn' },
  { to: '/admin/don-hang', title: 'Đơn hàng', hint: 'Theo dõi & cập nhật trạng thái xử lý' },
]

export default function AdminDashboardPage() {
  const { token, user } = useAuth()
  const department = (user?.department ?? null) as Department | null
  // GET /customers is cs/admin only — other departments would just get a 403.
  const canSeeCustomers = canAccessSection('/admin/khach-hang', department)
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    if (!token || !canSeeCustomers) return
    apiFetch<Customer[]>('/customers', {}, token).then(setCustomers).catch(() => setCustomers([]))
  }, [token, canSeeCustomers])

  const total = customers.length
  const active = customers.filter((c) => c.status === 'active').length
  const locked = customers.filter((c) => c.status === 'locked').length
  const deleted = customers.filter((c) => c.status === 'deleted').length
  const totalLtv = customers.reduce((sum, c) => sum + c.ltv, 0)

  const topCustomers = [...customers]
    .filter((c) => c.status !== 'deleted')
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 5)

  const orderStatusCounts = (Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((status) => ({
    status,
    count: INITIAL_ORDERS.filter((o) => o.status === status).length,
  }))

  return (
    <div>
      <h1>Tổng quan</h1>

      {canSeeCustomers && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md mb-space-lg">
        <div className={`${a.card} lg:col-span-2 flex flex-col`}>
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className={a.statLabel}>Tổng giá trị vòng đời khách hàng (LTV)</div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">trending_up</span> {LTV_DELTA_PCT}% so với kỳ trước
            </span>
          </div>
          <div className="font-headline-xl text-headline-xl text-primary my-space-sm">{formatVnd(totalLtv)}</div>
          <LineChart values={LTV_TREND} labels={LTV_LABELS} color="var(--st-primary)" height={180} />
        </div>

        <div className="flex flex-col gap-space-md">
          <div className={`${a.card} flex-1 flex flex-col justify-center`}>
            <div className={a.statLabel}>Tổng khách hàng</div>
            <div className={a.statValue}>{total}</div>
          </div>
          <div className={`${a.card} flex-1 flex flex-col justify-center`}>
            <div className={a.statLabel}>Đang hoạt động</div>
            <div className={`${a.statValue} !text-secondary`}>{active}</div>
          </div>
          <div className={`${a.card} flex-1 flex flex-col justify-center`}>
            <div className={a.statLabel}>Đã khoá / xoá mềm</div>
            <div className={`${a.statValue} !text-[#ca8a04]`}>
              {locked} <span className="font-title-lg text-title-lg text-error">/ {deleted}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className={`${a.filterBar} mb-space-md`}>
        {orderStatusCounts.map(({ status, count }) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full font-label-md text-label-md text-[var(--pill-color)] bg-[color-mix(in_srgb,var(--pill-color)_14%,transparent)] border border-[color-mix(in_srgb,var(--pill-color)_35%,transparent)]"
            style={{ '--pill-color': ORDER_STATUS_COLOR[status] } as CSSProperties}
          >
            {ORDER_STATUS_LABEL[status]} <strong className="font-extrabold">{count}</strong>
          </span>
        ))}
      </div>

      {canSeeCustomers && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md items-start">
        <div className={`${a.card} lg:col-span-2`}>
          <div className={`${a.statLabel} !mb-space-md`}>Top 5 khách hàng theo LTV</div>
          <table className={a.tableCompact}>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr><td className="text-on-surface-variant">Chưa có khách hàng nào</td></tr>
              ) : (
                topCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fullName ?? c.email}</td>
                    <td className="text-right font-bold">{formatVnd(c.ltv)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={a.card}>
          <div className={`${a.statLabel} !mb-space-md`}>Trạng thái tài khoản khách hàng</div>
          <DonutChart
            segments={[
              { label: 'Hoạt động', value: active, color: 'var(--st-secondary)' },
              { label: 'Đã khoá', value: locked, color: '#EAB308' },
              { label: 'Đã xoá mềm', value: deleted, color: 'var(--st-error)' },
            ]}
          />
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-md">
        {QUICK_LINKS.filter((l) => canAccessSection(l.to, department)).map((l) => (
          <Link key={l.to} className={a.quickLink} to={l.to}>
            <strong>{l.title}</strong>
            <span>{l.hint}</span>
          </Link>
        ))}
      </div>

      <p className="mt-space-lg font-body-md text-body-md text-on-surface-variant">
        Số liệu khách hàng là dữ liệu thật từ <code className="font-mono">GET /customers</code>. LTV/đơn hàng luôn là 0 và biểu đồ xu hướng/trạng thái đơn hàng
        vẫn là dữ liệu minh hoạ cho tới khi module Order được xây dựng.
      </p>
    </div>
  )
}
