import { Link } from 'react-router-dom'
import type { Product } from '../data/sampleProducts'
import { discountPercent, formatVnd } from '../data/sampleProducts'
import ProductThumb from './ProductThumb'

const AGE_RATING_CLASS: Record<string, string> = {
  '3+': 'age-badge--green',
  '12+': 'age-badge--yellow',
  '16+': 'age-badge--orange',
  '18+': 'age-badge--red',
}

function platformLabel(platforms?: string[]) {
  if (!platforms || platforms.length === 0) return null
  return platforms.length > 1 ? `${platforms[0]} +${platforms.length - 1}` : platforms[0]
}

export default function ProductCard({ product }: { product: Product }) {
  const pct = discountPercent(product.price, product.comparePrice)
  const withProgress = product.soldCount != null && product.limitCount != null
  const soldPct = withProgress ? Math.min(100, Math.round((product.soldCount! / product.limitCount!) * 100)) : 0
  const platform = platformLabel(product.platforms)

  return (
    <li className="product-card">
      <Link to={`/san-pham/${product.id}`}>
        <div className="product-card__media">
          <span className="product-card__badge">-{pct}%</span>
          {platform && <span className="product-card__platform">{platform}</span>}
          <ProductThumb seed={product.thumbSeed} productType={product.productType} />
        </div>
        <div className="product-card__body">
          <p className="product-card__name">{product.name}</p>
          <div className="product-card__price-row">
            <span className="product-card__price">{formatVnd(product.price)}</span>
            <span className="product-card__compare">{formatVnd(product.comparePrice)}</span>
            {product.productType === 'game_disc' && product.ageRating && (
              <span className={`age-badge ${AGE_RATING_CLASS[product.ageRating] ?? ''}`}>{product.ageRating}</span>
            )}
          </div>
          {product.rating ? (
            <div className="product-card__meta">
              <StarIcon />
              <span>{product.rating}</span>
            </div>
          ) : (
            <div className="product-card__meta">
              <span>Chưa có đánh giá</span>
            </div>
          )}
          {withProgress ? (
            <>
              <div className="product-card__progress">
                <div className="product-card__progress-fill" style={{ width: `${soldPct}%` }} />
              </div>
              <p className="product-card__sold">Đã bán {soldPct}%</p>
            </>
          ) : (
            <p className="product-card__sold">Đã bán {product.soldLabel}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 16.9l-5.2 2.9 1-5.9-4.3-4.2 5.9-.8L12 3.5Z" />
    </svg>
  )
}
