import { NavLink } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useAuth } from '../state/AuthContext'

const navItems = [
  { to: '/', label: 'Trang chủ', icon: '⌂', end: true },
  { to: '/tim-kiem', label: 'Tìm kiếm', icon: '⌕' },
  { to: '/gio-hang', label: 'Giỏ hàng', icon: '🛒' },
  { to: '/don-hang', label: 'Đơn mua', icon: '▤' },
]

export default function MobileNav() {
  const { totalQuantity } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <nav className="mobile-nav" aria-label="Điều hướng chính trên điện thoại">
      {navItems.map((item) => (
        <NavLink key={item.to} className="mobile-nav__item" to={item.to} end={item.end}>
          <span className="mobile-nav__icon" aria-hidden="true">
            {item.icon}
            {item.to === '/gio-hang' && totalQuantity > 0 && <b>{totalQuantity}</b>}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <NavLink className="mobile-nav__item" to={isAuthenticated ? '/ho-so' : '/dang-nhap'}>
        <span className="mobile-nav__icon" aria-hidden="true">◯</span>
        <span>{isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}</span>
      </NavLink>
    </nav>
  )
}
