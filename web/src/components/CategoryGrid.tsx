import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { fetchCategories, type CatalogCategory } from '../lib/catalog'

const MAX_TILES = 8

/** Material icon picked from the category's real name (Vietnamese keywords); falls back to a generic tag. */
function iconFor(name: string) {
  const n = name.toLocaleLowerCase('vi')
  if (n.includes('máy chơi') || n.includes('console')) return 'videogame_asset'
  if (n.includes('tai nghe')) return 'headphones'
  if (n.includes('bàn phím')) return 'keyboard'
  if (n.includes('edge')) return 'tune'
  if (n.includes('access')) return 'accessibility_new'
  if (n.includes('tay cầm') || n.includes('dualsense')) return 'sports_esports'
  if (n.includes('hành động')) return 'local_fire_department'
  if (n.includes('phiêu lưu') || n.includes('nhập vai')) return 'explore'
  if (n.includes('đua') || n.includes('thể thao')) return 'sports_score'
  if (n.includes('đĩa') || n.includes('game')) return 'album'
  if (n.includes('ốp') || n.includes('bọc')) return 'devices'
  if (n.includes('sạc')) return 'power'
  if (n.includes('camera')) return 'photo_camera'
  if (n.includes('phụ kiện')) return 'cable'
  return 'category'
}

/** "Danh mục nổi bật" — the real categories table (leaf categories first), each opening its category page. */
export default function CategoryGrid() {
  const [categories, setCategories] = useState<CatalogCategory[] | null>(null)

  useEffect(() => {
    let active = true
    fetchCategories()
      .then((list) => { if (active) setCategories(list) })
      .catch(() => { if (active) setCategories([]) })
    return () => { active = false }
  }, [])

  if (categories && categories.length === 0) return null

  const parentIds = new Set((categories ?? []).map((c) => c.parentId).filter(Boolean))
  const leaves = (categories ?? []).filter((c) => !parentIds.has(c.id))
  const tiles = (leaves.length > 0 ? leaves : categories ?? []).slice(0, MAX_TILES)

  return (
    <section id="danh-muc" className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Danh Mục Nổi Bật</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tay cầm, đĩa game &amp; phụ kiện PS5 chính hãng
          </p>
        </div>
        <a href="#goi-y" className="font-title-md text-title-md text-primary flex items-center gap-1 hover:underline">
          <span>Xem tất cả sản phẩm</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-space-md"
        style={{ '--cols': Math.max(tiles.length, categories ? 1 : MAX_TILES) } as CSSProperties}>
        {!categories && Array.from({ length: MAX_TILES }, (_, i) => (
          <div key={i} className="h-36 rounded-xl bg-surface-container-low animate-pulse" />
        ))}
        {tiles.map((category, index) => (
          <Link
            key={category.id}
            to={`/danh-muc/${category.slug}`}
            className="bg-surface-container-lowest p-space-md rounded-xl flex flex-col items-center text-center gap-space-sm hover:shadow-md hover:-translate-y-1 transition-all group border border-outline-variant/10 w-full"
          >
            <div
              className={`w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center transition-colors ${
                index % 4 === 3
                  ? 'text-secondary group-hover:bg-secondary group-hover:text-on-secondary'
                  : 'text-primary group-hover:bg-primary group-hover:text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-3xl">{iconFor(category.name)}</span>
            </div>
            <span className="font-title-md text-title-md text-on-surface leading-tight transition-colors group-hover:text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
