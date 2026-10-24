import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { canAccessSection, type Department } from './access'

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

// Grouped by class-diagram domain (A–E). Each item's `to` is looked up in
// admin/access.ts to decide whether the current user's department sees it —
// grouping stays flat here so that config file remains the only place access
// rules actually live.
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
      { to: '/admin/phieu-nhap', label: 'Phiếu nhập', icon: <path d="M4 5h16v14H4zM8 9h8M8 13h5M12 3v4m-3-2 3 3 3-3" /> },
    ],
  },
  {
    title: 'Đơn hàng',
    items: [
      { to: '/admin/don-hang', label: 'Danh sách đơn hàng', icon: <path d="M6 2h9l3 4v16H6zM9 10h6M9 13.5h6M9 17h4" /> },
      { to: '/admin/hoan-tien', label: 'Hoàn tiền', icon: <path d="M4 7h13a3 3 0 0 1 0 6H8M8 9 4 13l4 4M4 13h4" /> },
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
      { to: '/admin/crm', label: 'Hồ sơ & RFM', icon: <path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7l-8-4ZM9 12l2 2 4-4" /> },
      { to: '/admin/ho-tro', label: 'Hỗ trợ khách hàng', icon: <path d="M4 5h16v11H8l-4 4V5ZM8 9h8M8 12h5" /> },
      { to: '/admin/danh-gia', label: 'Đánh giá sản phẩm', icon: <path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3Z" /> },
      { to: '/admin/khao-sat', label: 'Khảo sát', icon: <path d="M9 4h6v3H9zM6 6H5v15h14V6h-1M8 12l2 2 4-4M8 17h8" /> },
      { to: '/admin/phan-khuc', label: 'Phân khúc', icon: <path d="M12 3v9h9A9 9 0 1 1 12 3ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" /> },
      { to: '/admin/chien-dich', label: 'Chiến dịch', icon: <path d="M4 10v4h3l6 4V6L7 10H4ZM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /> },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/admin/nhan-vien', label: 'Nhân viên', icon: <path d="M4 20c1.2-3.6 4.2-5.5 8-5.5s6.8 1.9 8 5.5M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
      { to: '/admin/nhat-ky', label: 'Nhật ký thao tác', icon: <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 14.5h7M9 18h4" /> },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/san-pham': 'Sản phẩm',
  '/admin/kho': 'Kho hàng',
  '/admin/phieu-nhap': 'Phiếu nhập hàng',
  '/admin/don-hang': 'Đơn hàng',
  '/admin/hoan-tien': 'Hoàn tiền',
  '/admin/marketing': 'Marketing',
  '/admin/khach-hang': 'Quản lý khách hàng',
  '/admin/bao-cao': 'Báo cáo nhân khẩu học',
  '/admin/crm': 'Hồ sơ & RFM khách hàng',
  '/admin/ho-tro': 'Hỗ trợ khách hàng',
  '/admin/danh-gia': 'Đánh giá sản phẩm',
  '/admin/khao-sat': 'Khảo sát khách hàng',
  '/admin/phan-khuc': 'Phân khúc khách hàng',
  '/admin/chien-dich': 'Chiến dịch chăm sóc',
  '/admin/nhan-vien': 'Nhân viên',
  '/admin/nhat-ky': 'Nhật ký thao tác',
}

const DEPARTMENT_LABEL: Record<Department, string> = {
  sales: 'Bán hàng',
  warehouse: 'Kho vận',
  admin: 'Quản trị viên',
  cs: 'Chăm sóc khách hàng',
}

export default function AdminLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const department = (user?.department ?? null) as Department | null
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? (location.pathname.startsWith('/admin/don-hang/') ? 'Chi tiết đơn hàng' : 'Quản trị')

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessSection(item.to, department)),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-surface text-on-surface">
      <aside className="md:sticky md:top-0 md:h-screen md:w-60 flex-shrink-0 flex md:flex-col items-center md:items-stretch gap-space-md md:gap-0 bg-[#14161a] text-[#e4e6eb] px-space-md py-space-sm md:py-space-lg">
        <div className="font-headline-md text-headline-md text-white md:mb-space-xl md:px-space-sm whitespace-nowrap">
          Chợ Tốt <span className="text-[#ffb4a2]">Mua</span>
          <span className="hidden md:block font-label-md text-label-md text-[#9aa0ac] font-medium">Trang quản trị</span>
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-y-auto" aria-label="Điều hướng quản trị">
          {visibleGroups.map((group, gi) => (
            <div className="flex md:flex-col gap-0.5 md:mb-space-md" key={group.title ?? `g${gi}`}>
              {group.title && <div className="hidden md:block px-space-sm pt-1.5 pb-0.5 font-label-sm text-label-sm uppercase tracking-wider text-[#6b7280]">{group.title}</div>}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) => `flex items-center gap-2.5 px-space-sm py-2.5 rounded-lg font-title-md text-title-md transition-colors whitespace-nowrap ${
                    isActive ? 'bg-primary text-on-primary' : 'text-[#b8bcc4] hover:bg-[#1f2126] hover:text-white'
                  }`}
                >
                  <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      {item.icon}
                    </g>
                  </svg>
                  <span className="hidden md:inline">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2.5 mt-space-lg pt-space-md px-space-xs border-t border-[#262930]">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center font-title-md text-title-md" aria-hidden="true">
            {(user?.fullName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-title-md text-title-md text-white truncate">{user?.fullName ?? 'Chưa đăng nhập'}</div>
            <div className="font-label-md text-label-md text-[#9aa0ac]">{department ? DEPARTMENT_LABEL[department] : '—'}</div>
          </div>
        </div>
        <Link className="hidden md:flex items-center gap-1 px-space-sm py-2.5 font-label-md text-label-md text-[#9aa0ac] hover:text-white" to="/">
          <span className="material-symbols-outlined text-base">arrow_back</span> Về trang khách hàng
        </Link>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between px-space-lg md:px-space-xl py-space-md bg-surface-container-lowest border-b border-line">
          <h2 className="font-title-lg text-title-lg text-on-surface">{pageTitle}</h2>
          <Link className="md:hidden font-label-md text-label-md text-primary" to="/">Về cửa hàng</Link>
        </header>
        <main className="flex-1 min-w-0 px-space-lg md:px-space-xl py-space-xl [&_h1]:font-headline-lg [&_h1]:text-headline-lg [&_h1]:text-on-surface [&_h1]:mb-space-lg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
