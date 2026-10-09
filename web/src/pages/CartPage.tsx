import { Link, useNavigate } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import ProductThumb from '../components/ProductThumb'
import { useCart } from '../state/CartContext'

export default function CartPage() {
  const navigate = useNavigate()
  const { lines, setQuantity, removeItem, setSelected, isLoading, error, busyIds } = useCart()

  if (isLoading && lines.length === 0) {
    return <div className="container"><div className="cart-empty">Đang tải giỏ hàng…</div></div>
  }

  if (lines.length === 0) {
    return (
      <div className="container">
        <div className="cart-empty">
          {error && <p className="cart-message cart-message--error">{error}</p>}
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link className="button button--primary" to="/">Tiếp tục mua sắm</Link>
        </div>
      </div>
    )
  }

  const selectedLines = lines.filter((line) => line.isSelected && line.available)
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

  return (
    <div className="container">
      <div className="cart-page">
        <div>
          <h1 className="section-title">Giỏ hàng ({lines.length})</h1>
          {error && <p className="cart-message cart-message--error" role="alert">{error}</p>}
          {lines.map((line) => {
            const busy = busyIds.has(line.id)
            return (
              <div className={`cart-item${line.available ? '' : ' cart-item--unavailable'}`} key={line.id}>
                <label className="cart-item__select">
                  <input
                    type="checkbox"
                    checked={line.isSelected && line.available}
                    disabled={!line.available || busy}
                    onChange={(event) => void setSelected(line.id, event.target.checked)}
                    aria-label={`Chọn ${line.product.name}`}
                  />
                </label>
                <div className="cart-item__media">
                  <ProductThumb
                    seed={line.product.thumbSeed}
                    productType={line.product.productType}
                    imageUrl={line.product.imageUrl}
                  />
                </div>
                <div className="cart-item__body">
                  <p className="cart-item__name">{line.product.name}</p>
                  {!line.available && <p className="cart-item__status">Sản phẩm hiện không còn bán</p>}
                  <div className="qty-stepper">
                    <button type="button" disabled={busy} onClick={() => void setQuantity(line.id, line.quantity - 1)} aria-label="Giảm số lượng">−</button>
                    <span>{line.quantity}</span>
                    <button type="button" disabled={busy || !line.available} onClick={() => void setQuantity(line.id, line.quantity + 1)} aria-label="Tăng số lượng">+</button>
                  </div>
                </div>
                <div className="cart-item__aside">
                  <p className="cart-item__price">{formatVnd(line.product.price * line.quantity)}</p>
                  <button className="cart-item__remove" type="button" disabled={busy} onClick={() => void removeItem(line.id)}>Xoá</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="cart-summary">
          <div className="cart-summary__row"><span>Đã chọn</span><span>{selectedLines.length} sản phẩm</span></div>
          <div className="cart-summary__row"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div>
          <div className="cart-summary__row"><span>Phí vận chuyển</span><span>Tính khi đặt hàng</span></div>
          <div className="cart-summary__row cart-summary__total"><span>Tổng cộng</span><span>{formatVnd(subtotal)}</span></div>
          <button
            className="button button--primary"
            type="button"
            style={{ width: '100%', marginTop: 'var(--space-3)' }}
            onClick={() => navigate('/thanh-toan')}
            disabled={selectedLines.length === 0}
          >
            Tiến hành thanh toán
          </button>
        </div>
      </div>
    </div>
  )
}
