import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'

interface Hub {
  name: string
  icon: string
  tab: 'controller' | 'game_disc' | 'accessory'
  platform?: string
  isSecondary?: boolean
}

const CATEGORY_HUBS: Hub[] = [
  { name: 'Tay Cầm DualSense', icon: 'sports_esports', tab: 'controller', platform: 'PS5' },
  { name: 'DualSense Edge Pro', icon: 'tune', tab: 'controller' },
  { name: 'PS5 Access Controller', icon: 'videogame_asset', tab: 'controller' },
  { name: 'Đĩa Game Hành Động', icon: 'local_fire_department', tab: 'game_disc', platform: 'PS5' },
  { name: 'Đĩa Game Phiêu Lưu', icon: 'explore', tab: 'game_disc', platform: 'PS5' },
  { name: 'Đĩa Game Đua Xe', icon: 'sports_score', tab: 'game_disc', platform: 'PS5' },
  { name: 'Ốp Bọc Máy PS5', icon: 'devices', tab: 'accessory' },
  { name: 'Đế Sạc & Phụ Kiện', icon: 'power', tab: 'accessory', isSecondary: true },
]

export default function CategoryGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const handleHubClick = (hub: Hub) => {
    if (location.pathname === '/') {
      const next = new URLSearchParams(searchParams)
      next.set('tab', hub.tab)
      if (hub.platform) {
        next.set('platform', hub.platform)
      } else {
        next.delete('platform')
      }
      setSearchParams(next, { replace: true })

      const el = document.getElementById('goi-y')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      navigate(`/?tab=${hub.tab}${hub.platform ? `&platform=${hub.platform}` : ''}#goi-y`)
    }
  }

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    if (location.pathname === '/') {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      next.delete('platform')
      setSearchParams(next, { replace: true })
      const el = document.getElementById('goi-y')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/#goi-y')
    }
  }

  return (
    <section id="danh-muc" className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Danh Mục Nổi Bật</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Lựa chọn thiết bị tay cầm &amp; đĩa game PS5 chính hãng
          </p>
        </div>
        <button
          type="button"
          onClick={handleViewAll}
          className="font-title-md text-title-md text-primary flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>Xem tất cả danh mục</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-space-md">
        {CATEGORY_HUBS.map((hub) => {
          return (
            <button
              key={hub.name}
              type="button"
              onClick={() => handleHubClick(hub)}
              className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-space-sm hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer border border-outline-variant/10 text-left w-full"
            >
              <div
                className={`w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center transition-colors ${
                  hub.isSecondary
                    ? 'text-secondary group-hover:bg-secondary group-hover:text-on-secondary'
                    : 'text-primary group-hover:bg-primary group-hover:text-on-primary'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">{hub.icon}</span>
              </div>
              <span
                className={`font-title-md text-title-md text-on-surface leading-tight transition-colors ${
                  hub.isSecondary ? 'group-hover:text-secondary' : 'group-hover:text-primary'
                }`}
              >
                {hub.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
