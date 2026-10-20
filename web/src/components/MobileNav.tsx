import { NavLink } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useAuth } from '../state/AuthContext'

const navItems = [
  { to: '/', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/tim-kiem', label: 'Tìm kiếm', icon: 'search' },
  { to: '/gio-hang', label: 'Giỏ hàng', icon: 'shopping_cart' },
  { to: '/don-hang', label: 'Đơn mua', icon: 'receipt_long' },
]

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-1.5 font-label-sm text-label-sm transition-colors ${
    isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
  }`

export default function MobileNav() {
  const { totalQuantity } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-surface-container-lowest border-t border-line shadow-[0_-1px_8px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Điều hướng chính trên điện thoại"
    >
      {navItems.map((item) => (
        <NavLink key={item.to} className={itemClass} to={item.to} end={item.end}>
          <span className="relative material-symbols-outlined text-2xl" aria-hidden="true">
            {item.icon}
            {item.to === '/gio-hang' && totalQuantity > 0 && (
              <b className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary font-sans text-[10px] leading-4 text-center">
                {totalQuantity}
              </b>
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <NavLink className={itemClass} to={isAuthenticated ? '/ho-so' : '/dang-nhap'}>
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">person</span>
        <span>{isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}</span>
      </NavLink>
    </nav>
  )
}
