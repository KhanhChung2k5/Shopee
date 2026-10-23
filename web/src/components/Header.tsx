import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useTheme } from '../state/useTheme'
import { useAuth } from '../state/AuthContext'
import { cacheCategories, fetchCategories, getCachedCategories, type CatalogCategory } from '../lib/catalog'

const CATEGORY_ICONS: Record<string, string> = {
  'tay-cam': 'sports_esports',
  'dia-game': 'album',
  'phu-kien': 'cable',
  'tai-nghe': 'headphones',
  'may-choi-game': 'videogame_asset',
  'ban-phim': 'keyboard',
}

export default function Header() {
  const { totalQuantity } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const { theme, toggle } = useTheme()
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>(() => getCachedCategories().filter((c) => c.parentId === null))

  useEffect(() => {
    let active = true
    fetchCategories()
      .then((items) => {
        if (!active) return
        cacheCategories(items)
        setCategories(items.filter((c) => c.parentId === null))
      })
      .catch(() => { /* keep the cached list */ })
    return () => { active = false }
  }, [])

  const handleNavFilter = (tab: 'controller' | 'game_disc' | 'accessory', platform?: string) => {
    if (window.location.pathname === '/') {
      const next = new URLSearchParams(window.location.search)
      next.set('tab', tab)
      if (platform) next.set('platform', platform)
      else next.delete('platform')
      navigate(`/?${next.toString()}#goi-y`, { replace: true })
      const el = document.getElementById('goi-y')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(`/?tab=${tab}${platform ? `&platform=${platform}` : ''}#goi-y`)
    }
  }

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      const el = document.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(`/#${sectionId}`)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed && category === 'all') return

    if (!trimmed && category !== 'all') {
      const tabMap: Record<string, 'controller' | 'game_disc' | 'accessory'> = {
        'tay-cam': 'controller',
        'dia-game': 'game_disc',
        'phu-kien': 'accessory',
      }
      if (tabMap[category]) {
        handleNavFilter(tabMap[category])
        return
      }
      navigate(`/danh-muc/${category}`)
      return
    }

    const params = new URLSearchParams()
    if (trimmed) params.set('q', trimmed)
    if (category !== 'all') {
      const typeMap: Record<string, string> = {
        'tay-cam': 'controller',
        'dia-game': 'game_disc',
        'phu-kien': 'accessory',
      }
      if (typeMap[category]) params.set('type', typeMap[category])
    }
    navigate(`/tim-kiem?${params.toString()}`)
  }

  const goSearch = (keyword: string) => {
    setQuery(keyword)
    navigate(`/tim-kiem?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      {/* 1. Top Bar */}
      <div className="hidden md:block bg-inverse-surface text-inverse-on-surface text-label-sm font-label-sm">
        <div className="max-w-[1280px] mx-auto px-margin-desktop h-8 flex items-center justify-between">
          <div className="flex items-center gap-space-lg">
            <span>
              Hotline: <strong className="text-primary-fixed">1900 6868</strong>
            </span>
            <a className="hover:text-primary-fixed transition-colors" href="#">
              Tải ứng dụng
            </a>
            <a className="hover:text-primary-fixed transition-colors" href="#">
              Kết nối cộng đồng game thủ
            </a>
          </div>
          <div className="flex items-center gap-space-lg">
            <Link className="hover:text-primary-fixed transition-colors" to="/don-hang">
              Tra cứu đơn hàng
            </Link>
            <a className="hover:text-primary-fixed transition-colors" href="#">
              Thông báo
            </a>
            <a className="hover:text-primary-fixed transition-colors" href="#">
              Hỗ trợ 24/7
            </a>
            <button
              id="theme-toggle"
              className="flex items-center gap-space-xs px-space-xs py-0.5 rounded bg-surface-container-highest/20 hover:bg-surface-container-highest/30 transition-colors cursor-pointer text-inverse-on-surface"
              type="button"
              onClick={toggle}
              title="Chuyển chế độ Sáng / Tối"
            >
              <span className="material-symbols-outlined text-sm">
                {theme === 'dark' ? 'dark_mode' : 'light_mode'}
              </span>
              <span>{theme === 'dark' ? 'Tối' : 'Sáng'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Search & Brand Bar */}
      <div className="bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-margin md:px-margin-desktop py-2 md:py-0 md:h-20 flex flex-wrap md:flex-nowrap items-center gap-x-space-lg gap-y-2">
          {/* Logo */}
          <Link className="flex items-center gap-space-sm flex-shrink-0" to="/" aria-label="Chợ Tốt Mua">
            <span className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
            </span>
            <div className="flex flex-col">
              <span className="font-title-lg text-title-lg md:font-headline-md md:text-headline-md text-primary tracking-tight leading-none uppercase whitespace-nowrap">
                CHỢ TỐT MUA
              </span>
              <span className="hidden sm:block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Gaming Gear &amp; Discs
              </span>
            </div>
          </Link>

          {/* Search Box */}
          <div className="order-last md:order-none w-full md:w-auto md:flex-1 flex flex-col justify-center max-w-3xl">
            <form onSubmit={handleSearch} className="flex items-center h-11 bg-surface-container-low rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <select
                aria-label="Chọn danh mục"
                className="hidden md:block h-full px-space-md bg-surface-container text-on-surface font-label-md text-label-md border-0 focus:ring-0 cursor-pointer outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                <option value="tay-cam">Tay cầm DualSense PS5</option>
                <option value="dia-game">Đĩa game PS5 bản quyền</option>
                <option value="phu-kien">Phụ kiện &amp; Ốp bọc PS5</option>
              </select>
              <div className="hidden md:block h-5 w-px bg-outline-variant"></div>
              <input
                className="flex-1 min-w-0 h-full px-space-md bg-transparent text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md border-0 focus:ring-0 outline-none"
                placeholder="Tìm kiếm tay cầm DualSense, đĩa game PS5, Astro Bot, Spider-Man 2..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                aria-label="Tìm kiếm"
                className="h-full px-space-md md:px-space-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md flex items-center gap-space-xs transition-colors cursor-pointer"
                type="submit"
              >
                <span className="material-symbols-outlined text-xl">search</span>
                <span className="hidden sm:inline">Tìm kiếm</span>
              </button>
            </form>

            {/* Trending Keywords */}
            <div className="hidden md:flex items-center gap-space-sm mt-1 overflow-hidden whitespace-nowrap text-label-sm font-label-sm">
              <span className="text-on-surface-variant">Xu hướng:</span>
              <button
                type="button"
                onClick={() => goSearch('DualSense Edge')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                DualSense Edge
              </button>
              <span className="text-outline-variant">•</span>
              <button
                type="button"
                onClick={() => goSearch('Spider-Man 2')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Spider-Man 2
              </button>
              <span className="text-outline-variant">•</span>
              <button
                type="button"
                onClick={() => goSearch('Astro Bot')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Astro Bot
              </button>
              <span className="text-outline-variant">•</span>
              <button
                type="button"
                onClick={() => goSearch('Stellar Blade')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Stellar Blade
              </button>
              <span className="text-outline-variant">•</span>
              <button
                type="button"
                onClick={() => goSearch('God of War')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                God of War
              </button>
              <span className="text-outline-variant">•</span>
              <button
                type="button"
                onClick={() => goSearch('Đế sạc')}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Đế sạc DualSense
              </button>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-space-sm md:gap-space-lg ml-auto flex-shrink-0">
            {/* Theme toggle lives in the top bar on desktop; phones hide that bar. */}
            <button
              type="button"
              onClick={toggle}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container cursor-pointer"
              title="Chuyển chế độ Sáng / Tối"
              aria-label="Chuyển chế độ Sáng / Tối"
            >
              <span className="material-symbols-outlined text-xl">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
            </button>
            {/* Cart */}
            <Link
              className="relative flex flex-col items-center text-on-surface hover:text-primary transition-colors p-space-xs"
              to="/gio-hang"
              title="Giỏ hàng"
            >
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              <span className="hidden md:block font-label-sm text-label-sm mt-0.5">Giỏ hàng</span>
              <span className="absolute top-0 right-2 w-4 h-4 bg-primary text-on-primary font-label-sm text-label-sm rounded-full flex items-center justify-center font-bold transition-transform duration-200">
                {totalQuantity}
              </span>
            </Link>

            <div className="hidden md:block h-8 w-px bg-surface-container-high"></div>

            {/* User Account */}
            {isAuthenticated && user ? (
              <div className="relative group">
                <Link to="/ho-so" className="flex items-center gap-space-sm pl-space-xs cursor-pointer">
                  <div className="relative">
                    <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-title-md text-title-md" aria-hidden="true">
                      {(user.fullName || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary rounded-full ring-2 ring-surface-container-lowest"></span>
                  </div>
                  <div className="hidden lg:flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-title-md text-title-md text-on-surface leading-tight max-w-[100px] truncate">
                        {user.fullName || 'Tài khoản'}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Tài khoản &amp; Đơn mua
                    </span>
                  </div>
                </Link>
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                  <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 py-2 w-48 text-on-surface">
                    <Link to="/ho-so" className="block px-4 py-2 hover:bg-surface-container text-title-md">
                      Hồ sơ cá nhân
                    </Link>
                    <Link to="/don-hang" className="block px-4 py-2 hover:bg-surface-container text-title-md">
                      Đơn hàng của tôi
                    </Link>
                    <Link to="/kho-voucher" className="block px-4 py-2 hover:bg-surface-container text-title-md">
                      Kho voucher
                    </Link>
                    {user.role === 'staff' && (
                      <Link to="/admin" className="block px-4 py-2 text-primary hover:bg-surface-container text-title-md font-bold">
                        Trang quản trị (Admin)
                      </Link>
                    )}
                    <div className="border-t border-surface-container my-1"></div>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2 hover:bg-surface-container text-primary text-title-md cursor-pointer"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/dang-nhap"
                className="flex items-center gap-space-sm pl-space-xs hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-lg">person</span>
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="font-title-md text-title-md text-on-surface leading-tight">Đăng nhập</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Tài khoản &amp; Đơn hàng</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. Category & Navigation Bar */}
      <div className="hidden md:block bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-margin-desktop h-11 flex items-center justify-between gap-space-md">
          <div className="relative">
            <button
              className="flex items-center gap-space-sm px-space-md py-1.5 whitespace-nowrap bg-primary text-on-primary font-title-md text-title-md rounded-lg hover:bg-primary-container transition-colors shadow-[0_1px_3px_rgba(15,23,42,0.05)] cursor-pointer"
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <span className="material-symbols-outlined text-lg">sports_esports</span>
              <span>Danh mục sản phẩm</span>
              <span className="material-symbols-outlined text-base">
                {isCategoryOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {isCategoryOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/danh-muc/${cat.slug}`}
                    onClick={() => setIsCategoryOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-on-surface hover:bg-surface-container hover:text-primary text-title-md"
                  >
                    <span className="material-symbols-outlined text-xl">{CATEGORY_ICONS[cat.slug] ?? 'category'}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}

              </div>
            )}
          </div>

          <nav className="flex items-center gap-1 min-w-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => scrollToSection('flash-sale')}
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              🔥 Flash Sale Giờ Vàng
            </button>
            <button
              type="button"
              onClick={() => handleNavFilter('controller')}
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              🎮 Tay Cầm Gaming
            </button>
            <button
              type="button"
              onClick={() => handleNavFilter('game_disc')}
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              💿 Đĩa Game Bản Quyền
            </button>
            <button
              type="button"
              onClick={() => handleNavFilter('accessory')}
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              🛡️ Phụ Kiện Console
            </button>
            <Link
              to="/kho-voucher"
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              🎁 Mã Giảm Giá
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('cam-ket')}
              className="px-space-sm xl:px-space-md py-1.5 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-title-md text-title-md rounded-lg cursor-pointer"
            >
              🛡️ Bảo Hành 1 Đổi 1
            </button>

          </nav>
        </div>
      </div>
    </header>
  )
}
