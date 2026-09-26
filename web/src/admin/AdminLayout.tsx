import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import './admin.css'

interface NavItem {
  to: string
  end?: boolean
  label: string
  icon: React.ReactNode
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

// Grouped by class-diagram domain (A–E) rather than flat, so that once
// role-guards exist (Employee.department: sales/warehouse/admin/cs), each
// group can be shown/hidden per role without restructuring the sidebar.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/admin', end: true, label: 'Tổng quan', icon: <path d="M4 13h6V4H4v9ZM14 20h6v-9h-6v9ZM4 20h6v-5H4v5ZM14 11h6V4h-6v7Z" /> },
    ],
  },
  {
    title: 'Catalog & Kho',
    items: [
      { to: '/admin/san-pham', label: 'Sản phẩm', icon: <path d="M20 7 12 3 4 7v10l8 4 8-4V7ZM4 7l8 4 8-4M12 11v10" /> },
      { to: '/admin/kho', label: 'Kho hàng', icon: <path d="M3 10 12 4l9 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9ZM9 20v-6h6v6" /> },
    ],
  },
  {
    title: 'Đơn hàng',
    items: [
      { to: '/admin/don-hang', label: 'Danh sách đơn hàng', icon: <path d="M6 2h9l3 4v16H6zM9 10h6M9 13.5h6M9 17h4" /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/marketing', label: 'Voucher & Flash Sale', icon: <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.16V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.64a1.6 1.6 0 0 0 0-3.16V9ZM14 7v10" /> },
    ],
  },
  {
    title: 'CRM',
    items: [
      { to: '/admin/khach-hang', label: 'Khách hàng', icon: <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.2a3 3 0 0 0-2.2-2.9M15 4.2a3 3 0 0 1 0 5.8" /> },
      { to: '/admin/bao-cao', label: 'Báo cáo nhân khẩu học', icon: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /> },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/admin/nhan-vien', label: 'Nhân viên', icon: <path d="M4 20c1.2-3.6 4.2-5.5 8-5.5s6.8 1.9 8 5.5M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/san-pham': 'Sản phẩm',
  '/admin/kho': 'Kho hàng',
  '/admin/don-hang': 'Đơn hàng',
  '/admin/marketing': 'Marketing',
  '/admin/khach-hang': 'Quản lý khách hàng',
  '/admin/bao-cao': 'Báo cáo nhân khẩu học',
  '/admin/nhan-vien': 'Nhân viên',
}

export default function AdminLayout() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Quản trị'

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          Chợ Tốt Mua
          <span>Trang quản trị</span>
        </div>
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {NAV_GROUPS.map((group, gi) => (
            <div className="admin-nav__group" key={group.title ?? `g${gi}`}>
              {group.title && <div className="admin-nav__group-title">{group.title}</div>}
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      {item.icon}
                    </g>
                  </svg>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar__user">
          <div className="admin-sidebar__avatar" aria-hidden="true">A</div>
          <div>
            <div className="admin-sidebar__user-name">Admin</div>
            <div className="admin-sidebar__user-role">Quản trị viên</div>
          </div>
        </div>
        <div className="admin-sidebar__back">
          <Link to="/">← Về trang khách hàng</Link>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <h2>{pageTitle}</h2>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
