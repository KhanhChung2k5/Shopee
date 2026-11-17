import { Link } from 'react-router-dom'
import ProductThumb from './ProductThumb'
import { formatPrice } from './ui'
import { useRecentlyViewed } from '../lib/savedProducts'

/** Home page row of the products this buyer opened last; hidden until there is at least one. */
export default function RecentlyViewedStrip() {
  const { items } = useRecentlyViewed()
  if (items.length === 0) return null
  return (
    <section aria-labelledby="recently-viewed-title" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
      <div className="flex items-center justify-between gap-space-md mb-space-md">
        <h2 id="recently-viewed-title" className="flex items-center gap-space-xs font-headline-md text-headline-md text-on-surface">
          <span className="material-symbols-outlined text-primary">history</span>Đã xem gần đây
        </h2>
        <Link to="/yeu-thich?tab=da-xem" className="font-title-md text-title-md text-primary hover:underline">Xem tất cả</Link>
      </div>
      <div className="flex gap-space-md overflow-x-auto pb-1">
        {items.slice(0, 10).map((p, i) => (
          <Link key={p.id} to={`/san-pham/${p.id}`} className="w-36 flex-shrink-0 group">
            <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-low mb-space-xs">
              <div className="w-full h-full group-hover:scale-105 transition-transform duration-300">
                <ProductThumb seed={i} productType={p.productType} imageUrl={p.imageUrl ?? undefined} />
              </div>
            </div>
            <div className="font-label-md text-label-md text-on-surface line-clamp-2 group-hover:text-primary">{p.name}</div>
            {p.price != null && <div className="font-title-md text-title-md text-primary">{formatPrice(p.price)}</div>}
          </Link>
        ))}
      </div>
    </section>
  )
}
