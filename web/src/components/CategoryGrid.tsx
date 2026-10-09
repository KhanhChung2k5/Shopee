import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cacheCategories, fetchCategories, getCachedCategories, type CatalogCategory } from '../lib/catalog'
import { useRevealOnScroll } from '../state/useRevealOnScroll'

const ICONS: Record<string, string> = {
  gamepad: 'M8 9h1.5m-.75-.75v1.5M14.5 10h.01M16.5 8h.01M6 6h12a3 3 0 0 1 3 3.4l-.9 6.3a2.3 2.3 0 0 1-4-1L15.5 13h-7L7.4 14.7a2.3 2.3 0 0 1-4 1L2.5 9.4A3 3 0 0 1 6 6Z',
  disc: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  accessory: 'M6 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0ZM12 8v4l2.5 1.5',
  headset: 'M4 13v-1a8 8 0 0 1 16 0v1M4 13v5a2 2 0 0 0 2 2h1v-7H5a1 1 0 0 0-1 1ZM20 13v5a2 2 0 0 1-2 2h-1v-7h2a1 1 0 0 1 1 1Z',
}

export default function CategoryGrid() {
  const revealRef = useRevealOnScroll<HTMLUListElement>()
  const [categories, setCategories] = useState<CatalogCategory[]>(getCachedCategories)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    fetchCategories()
      .then((items) => {
        if (!active) return
        setCategories(items)
        cacheCategories(items)
        setMessage(items.length === 0 ? 'Database hiện chưa có danh mục.' : '')
      })
      .catch(() => {
        if (!active) return
        const cached = getCachedCategories()
        setCategories(cached)
        setMessage(cached.length > 0
          ? 'API đang mất kết nối; đang giữ danh mục đã tải gần nhất.'
          : 'Không tải được danh mục. Hãy kiểm tra backend rồi thử tải lại.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retryKey])

  return (
    <section id="categories" className="section" aria-labelledby="categories-heading">
      <div className="container">
        <h2 id="categories-heading" className="section-title section-title--plain">Danh mục nổi bật</h2>
        {loading && <p aria-live="polite">Đang tải danh mục…</p>}
        {message && <p role="status" style={{ color: 'var(--color-muted-foreground)' }}>
          {message}{' '}
          <button className="button button--outline" type="button" onClick={() => { setLoading(true); setRetryKey((value) => value + 1) }}>Thử tải lại</button>
        </p>}
        <ul className="category-grid reveal-grid" ref={revealRef}>
          {categories.map((cat) => {
            const iconKey = /đĩa|game/i.test(cat.name) ? 'disc' : /tay cầm|controller/i.test(cat.name) ? 'gamepad' : 'accessory'
            return <li key={cat.id}>
              <Link to={`/danh-muc/${cat.slug}`}>
                <span className="category-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d={ICONS[iconKey]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {cat.name}
              </Link>
            </li>
          })}
        </ul>
        {!loading && !message && categories.length === 0 && <p role="status">Chưa có danh mục để hiển thị.</p>}
      </div>
    </section>
  )
}
