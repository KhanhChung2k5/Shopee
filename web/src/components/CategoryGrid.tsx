import { Link } from 'react-router-dom'
import { CATEGORIES, categorySlug } from '../data/sampleProducts'
import { useRevealOnScroll } from '../state/useRevealOnScroll'

const ICONS: Record<string, string> = {
  gamepad: 'M8 9h1.5m-.75-.75v1.5M14.5 10h.01M16.5 8h.01M6 6h12a3 3 0 0 1 3 3.4l-.9 6.3a2.3 2.3 0 0 1-4-1L15.5 13h-7L7.4 14.7a2.3 2.3 0 0 1-4 1L2.5 9.4A3 3 0 0 1 6 6Z',
  disc: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  accessory: 'M6 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0ZM12 8v4l2.5 1.5',
  headset: 'M4 13v-1a8 8 0 0 1 16 0v1M4 13v5a2 2 0 0 0 2 2h1v-7H5a1 1 0 0 0-1 1ZM20 13v5a2 2 0 0 1-2 2h-1v-7h2a1 1 0 0 1 1 1Z',
}

export default function CategoryGrid() {
  const revealRef = useRevealOnScroll<HTMLUListElement>()

  return (
    <section className="section" aria-labelledby="categories-heading">
      <div className="container">
        <h2 id="categories-heading" className="section-title section-title--plain">Danh mục nổi bật</h2>
        <ul className="category-grid reveal-grid" ref={revealRef}>
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <Link to={`/danh-muc/${categorySlug(cat.label)}`}>
                <span className="category-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d={ICONS[cat.iconKey]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {cat.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
