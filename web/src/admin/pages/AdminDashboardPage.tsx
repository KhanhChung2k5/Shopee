import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { INITIAL_CUSTOMERS } from '../data/sampleCustomers'
import { INITIAL_ORDERS, ORDER_STATUS_LABEL, type OrderStatus } from '../data/sampleOrders'
import { formatVnd } from '../../data/sampleProducts'
import LineChart from '../components/LineChart'
import DonutChart from '../components/DonutChart'

// Mock 7-period LTV trend — stands in for a real time-series query.
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

export default function AdminDashboardPage() {
  const total = INITIAL_CUSTOMERS.length
  const active = INITIAL_CUSTOMERS.filter((c) => c.status === 'active').length
  const locked = INITIAL_CUSTOMERS.filter((c) => c.status === 'locked').length
  const deleted = INITIAL_CUSTOMERS.filter((c) => c.status === 'deleted').length
  const totalLtv = INITIAL_CUSTOMERS.reduce((sum, c) => sum + c.ltv, 0)

  const topCustomers = [...INITIAL_CUSTOMERS]
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

      <div className="admin-hero-grid">
        <div className="admin-stat-card admin-stat-card--hero">
          <div className="admin-toolbar" style={{ marginBottom: 0 }}>
            <div className="admin-stat-card__label">Tổng giá trị vòng đời khách hàng (LTV)</div>
            <span className="delta-badge delta-badge--up">▲ {LTV_DELTA_PCT}% so với kỳ trước</span>
          </div>
          <div className="admin-stat-card__value admin-stat-card__value--xl">{formatVnd(totalLtv)}</div>
          <LineChart values={LTV_TREND} labels={LTV_LABELS} color="var(--color-primary)" height={180} />
        </div>

        <div className="admin-mini-stack">
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Tổng khách hàng</div>
            <div className="admin-stat-card__value">{total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Đang hoạt động</div>
            <div className="admin-stat-card__value" style={{ color: 'var(--color-trust)' }}>{active}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card__label">Đã khoá / xoá mềm</div>
            <div className="admin-stat-card__value" style={{ color: '#EAB308' }}>
              {locked} <span style={{ fontSize: 16, color: 'var(--color-urgent)' }}>/ {deleted}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {orderStatusCounts.map(({ status, count }) => (
            <span key={status} className="order-pill" style={{ '--pill-color': ORDER_STATUS_COLOR[status] } as CSSProperties}>
              {ORDER_STATUS_LABEL[status]} <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Top 5 khách hàng theo LTV</div>
          <table className="admin-table admin-table--compact">
            <tbody>
              {topCustomers.map((c) => (
                <tr key={c.id}>
                  <td>{c.fullName}</td>
                  <td style={{ color: 'var(--color-muted-foreground)' }}>{c.favoriteCategory}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatVnd(c.ltv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Trạng thái tài khoản khách hàng</div>
          <DonutChart
            segments={[
              { label: 'Hoạt động', value: active, color: 'var(--color-trust)' },
              { label: 'Đã khoá', value: locked, color: '#EAB308' },
              { label: 'Đã xoá mềm', value: deleted, color: 'var(--color-urgent)' },
            ]}
          />
        </div>
      </div>

      <div className="admin-quick-links" style={{ marginTop: 'var(--space-3)', flexDirection: 'row', flexWrap: 'wrap' }}>
        <Link className="admin-quick-link" to="/admin/khach-hang">
          <strong>Quản lý khách hàng</strong>
          <span>Thêm mới, khoá/mở, xoá mềm tài khoản</span>
        </Link>
        <Link className="admin-quick-link" to="/admin/bao-cao">
          <strong>Báo cáo nhân khẩu học</strong>
          <span>Phân bố tuổi, giới tính, ngành hàng ưa thích</span>
        </Link>
        <Link className="admin-quick-link" to="/admin/san-pham">
          <strong>Sản phẩm</strong>
          <span>Danh sách catalog, trạng thái đang bán/ẩn</span>
        </Link>
        <Link className="admin-quick-link" to="/admin/don-hang">
          <strong>Đơn hàng</strong>
          <span>Theo dõi & cập nhật trạng thái xử lý</span>
        </Link>
      </div>

      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-4)' }}>
        Dữ liệu minh hoạ — sẽ thay bằng số liệu thật từ <code>CustomerProfileCRM</code> khi API backend hoàn thiện.
      </p>
    </div>
  )
}
