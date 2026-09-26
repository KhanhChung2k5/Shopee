import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { findProduct, discountPercent, formatVnd, CONNECTION_LABELS } from '../data/sampleProducts'
import ProductThumb from '../components/ProductThumb'
import { useCart } from '../state/CartContext'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const product = id ? findProduct(id) : undefined
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) {
    return (
      <div className="container" style={{ padding: 'var(--space-6) 0', textAlign: 'center' }}>
        <p>Không tìm thấy sản phẩm.</p>
        <Link className="button button--outline" to="/">Về trang chủ</Link>
      </div>
    )
  }

  const pct = discountPercent(product.price, product.comparePrice)

  return (
    <div className="container">
      <div className="product-detail">
        <div className="product-detail__media">
          <ProductThumb seed={product.thumbSeed} productType={product.productType} />
        </div>
        <div>
          <h1 className="product-detail__title">{product.name}</h1>
          <div className="product-detail__price-row">
            <span className="product-detail__badge">-{pct}%</span>
            <span className="product-detail__price">{formatVnd(product.price)}</span>
            <span className="product-detail__compare">{formatVnd(product.comparePrice)}</span>
          </div>
          <div className="product-detail__meta">
            {product.rating && <span>⭐ {product.rating}</span>}
            <span>Đã bán {product.soldLabel ?? product.soldCount}</span>
          </div>

          <dl className="product-detail__specs">
            {product.platforms && (
              <div><dt>Nền tảng</dt><dd>{product.platforms.join(', ')}</dd></div>
            )}
            {product.productType === 'game_disc' && product.publisher && (
              <div><dt>Nhà phát hành</dt><dd>{product.publisher}</dd></div>
            )}
            {product.productType === 'game_disc' && product.genre && (
              <div><dt>Thể loại</dt><dd>{product.genre}</dd></div>
            )}
            {product.productType === 'game_disc' && product.ageRating && (
              <div><dt>Phân loại độ tuổi</dt><dd>{product.ageRating}</dd></div>
            )}
            {product.connectionType && (
              <div><dt>Kết nối</dt><dd>{CONNECTION_LABELS[product.connectionType]}</dd></div>
            )}
            {product.warrantyMonths && (
              <div><dt>Bảo hành</dt><dd>{product.warrantyMonths} tháng</dd></div>
            )}
          </dl>

          <div className="product-detail__qty">
            <span>Số lượng</span>
            <div className="qty-stepper">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm số lượng">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Tăng số lượng">+</button>
            </div>
          </div>

          <div className="product-detail__actions">
            <button
              className="button button--outline"
              type="button"
              onClick={() => {
                addItem(product.id, qty)
                setAdded(true)
              }}
            >
              {added ? 'Đã thêm vào giỏ ✓' : 'Thêm vào giỏ hàng'}
            </button>
            <Link className="button button--primary" to="/gio-hang" onClick={() => addItem(product.id, qty)}>
              Mua ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
