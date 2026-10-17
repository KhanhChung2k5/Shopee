import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import ProductThumb from './ProductThumb'
import { formatVnd, type CatalogProductSummary } from '../lib/catalog'

export default function CatalogProductGrid({
  products,
  className = 'product-grid',
  listRef,
}: {
  products: CatalogProductSummary[]
  className?: string
  listRef?: Ref<HTMLUListElement>
}) {
  if (products.length === 0) {
    return <p style={{ color: 'var(--color-muted-foreground)', padding: 'var(--space-5) 0' }}>Không tìm thấy sản phẩm nào.</p>
  }

  return (
    <ul className={className} ref={listRef}>
      {products.map((product, index) => (
        <li className="product-card" key={product.id}>
          <Link to={`/san-pham/${product.id}`}>
            <div className="product-card__media">
              {product.price != null && product.comparePrice != null && product.comparePrice > product.price && (
                <span className="product-card__badge">-{Math.round((1 - product.price / product.comparePrice) * 100)}%</span>
              )}
              {product.platforms?.[0] && <span className="product-card__platform">{product.platforms[0]}</span>}
              <ProductThumb
                seed={index}
                productType={product.productType}
                imageUrl={product.imageUrls?.[0]}
              />
            </div>
            <div className="product-card__body">
              <p className="product-card__name">{product.name}</p>
              <div className="product-card__price-row">
                <span className="product-card__price">{formatVnd(product.price)}</span>
                {product.comparePrice != null && product.price != null && product.comparePrice > product.price && (
                  <span className="product-card__compare">{formatVnd(product.comparePrice)}</span>
                )}
              </div>
              <p className="product-card__sold">{product.brandName ?? 'Chính hãng'} · {product.platforms?.join(', ') ?? 'Đa nền tảng'}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
