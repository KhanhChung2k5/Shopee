import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useTheme } from '../state/useTheme'

export default function Header() {
  const { totalQuantity } = useCart()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { theme, toggle } = useTheme()

  const goSearch = (q: string) => {
    if (!q.trim()) return
    navigate(`/tim-kiem?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar__inner">
          <ul className="topbar__links">
            <li><a href="#">Kênh Người Bán</a></li>
            <li><a href="#">Tải ứng dụng</a></li>
            <li><a href="#">Kết nối</a></li>
          </ul>
          <ul className="topbar__links topbar__links--right">
            <li><a href="#">Trợ giúp</a></li>
            <li><a href="#">Thông báo</a></li>
          </ul>
        </div>
      </div>

      <div className="main-header">
        <div className="container main-header__inner">
          <Link className="logo" to="/" aria-label="Chợ Tốt Mua – Trang chủ">
            <svg className="logo__mark" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <rect width="34" height="34" rx="9" fill="var(--color-primary)" />
              <path d="M9 14.5C9 12 11 10 13.5 10H20.5C23 10 25 12 25 14.5V15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 15H26L24.7 24.4C24.5 25.9 23.2 27 21.7 27H12.3C10.8 27 9.5 25.9 9.3 24.4L8 15Z" fill="#fff" />
              <circle cx="14.5" cy="20.5" r="1.6" fill="var(--color-primary)" />
              <circle cx="19.5" cy="20.5" r="1.6" fill="var(--color-primary)" />
            </svg>
            <span className="logo__text">Chợ Tốt Mua</span>
          </Link>

          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              goSearch(query)
            }}
          >
            <label className="sr-only" htmlFor="search-input">Tìm kiếm sản phẩm</label>
            <input
              id="search-input"
              className="search__input"
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tay cầm, đĩa game theo nền tảng..."
            />
            <button className="search__button" type="submit" aria-label="Tìm kiếm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
            <div className="search__hints">
              <span>Gợi ý:</span>
              <button type="button" onClick={() => goSearch('PS5')}>Tay cầm PS5</button>
              <button type="button" onClick={() => goSearch('Nintendo Switch')}>Đĩa game Nintendo Switch</button>
              <button type="button" onClick={() => goSearch('tai nghe')}>Tai nghe gaming</button>
            </div>
          </form>

          <div className="header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              onClick={toggle}
            >
              {theme === 'dark' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
              )}
            </button>
            <button className="icon-button" type="button" aria-label="Thông báo (3 thông báo mới)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 10a6 6 0 1 1 12 0v4.5l1.6 2.4a1 1 0 0 1-.83 1.6H5.23a1 1 0 0 1-.83-1.6L6 14.5V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <span className="icon-button__badge">3</span>
            </button>
            <Link className="icon-button" to="/gio-hang" aria-label={`Giỏ hàng, ${totalQuantity} sản phẩm`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h2l1.6 10.6a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L20.5 9H7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="21" r="1.4" fill="currentColor" /><circle cx="17.5" cy="21" r="1.4" fill="currentColor" /></svg>
              {totalQuantity > 0 && <span className="icon-button__badge">{totalQuantity}</span>}
            </Link>
            <Link className="account-link" to="/dang-nhap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.5" r="3.4" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20c1.1-3.4 4-5.2 7-5.2s5.9 1.8 7 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
