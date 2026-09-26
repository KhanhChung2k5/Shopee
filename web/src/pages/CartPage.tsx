import { Link, useNavigate } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import ProductThumb from '../components/ProductThumb'
import { useCart, useCartLinesWithProducts } from '../state/CartContext'

export default function CartPage() {
  const navigate = useNavigate()
  const { setQuantity, removeItem } = useCart()
  const lines = useCartLinesWithProducts()

  if (lines.length === 0) {
    return (
      <div className="container">
        <div className="cart-empty">
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link className="button button--primary" to="/">Tiếp tục mua sắm</Link>
        </div>
      </div>
    )
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)

  return (
    <div className="container">
      <div className="cart-page">
        <div>
          <h1 className="section-title">Giỏ hàng ({lines.length})</h1>
          {lines.map((l) => (
            <div className="cart-item" key={l.productId}>
              <div className="cart-item__media">
                <ProductThumb seed={l.product.thumbSeed} productType={l.product.productType} />
              </div>
              <div className="cart-item__body">
                <p className="cart-item__name">{l.product.name}</p>
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQuantity(l.productId, l.quantity - 1)} aria-label="Giảm số lượng">−</button>
                  <span>{l.quantity}</span>
                  <button type="button" onClick={() => setQuantity(l.productId, l.quantity + 1)} aria-label="Tăng số lượng">+</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="cart-item__price">{formatVnd(l.product.price * l.quantity)}</p>
                <button className="cart-item__remove" type="button" onClick={() => removeItem(l.productId)}>Xoá</button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-summary__row">
            <span>Tạm tính</span>
            <span>{formatVnd(subtotal)}</span>
          </div>
          <div className="cart-summary__row">
            <span>Phí vận chuyển</span>
            <span>Miễn phí</span>
          </div>
          <div className="cart-summary__row cart-summary__total">
            <span>Tổng cộng</span>
            <span>{formatVnd(subtotal)}</span>
          </div>
          <button
            className="button button--primary"
            type="button"
            style={{ width: '100%', marginTop: 'var(--space-3)' }}
            onClick={() => navigate('/thanh-toan')}
          >
            Tiến hành thanh toán
          </button>
        </div>
      </div>
    </div>
  )
}
