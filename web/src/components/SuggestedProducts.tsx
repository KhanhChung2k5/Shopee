import { useState } from 'react'
import { SUGGESTED_PRODUCTS } from '../data/sampleProducts'
import ProductCard from './ProductCard'
import { useRevealOnScroll } from '../state/useRevealOnScroll'

const PAGE_SIZE = 10

export default function SuggestedProducts() {
  const [shown, setShown] = useState(PAGE_SIZE)
  const visible = SUGGESTED_PRODUCTS.slice(0, shown)
  const hasMore = shown < SUGGESTED_PRODUCTS.length
  const revealRef = useRevealOnScroll<HTMLUListElement>()

  return (
    <section id="suggested-products" className="section" aria-labelledby="suggested-heading">
      <div className="container">
        <h2 id="suggested-heading" className="section-title section-title--plain">Gợi ý hôm nay</h2>
        <ul className="product-grid reveal-grid" ref={revealRef}>
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
        {hasMore && (
          <div className="load-more-wrap">
            <button className="button button--outline" type="button" onClick={() => setShown((s) => s + PAGE_SIZE)}>
              Xem thêm sản phẩm
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
