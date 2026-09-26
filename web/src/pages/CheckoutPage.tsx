import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import { SAMPLE_ADDRESSES, PAYMENT_METHODS, type PaymentMethod } from '../data/sampleAddresses'
import ProductThumb from '../components/ProductThumb'
import { useCart, useCartLinesWithProducts } from '../state/CartContext'

export default function CheckoutPage() {
  const { clearCart } = useCart()
  const lines = useCartLinesWithProducts()
  const [addressId, setAddressId] = useState(SAMPLE_ADDRESSES.find((a) => a.isDefault)?.id ?? SAMPLE_ADDRESSES[0]?.id)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [placed, setPlaced] = useState(false)

  if (lines.length === 0 && !placed) {
    return (
      <div className="container">
        <div className="cart-empty">
          <p>Giỏ hàng của bạn đang trống, chưa có gì để thanh toán.</p>
          <Link className="button button--primary" to="/">Tiếp tục mua sắm</Link>
        </div>
      </div>
    )
  }

  if (placed) {
    return (
      <div className="container">
        <div className="checkout-success">
          <p style={{ fontSize: 40, marginBottom: 8 }}>✓</p>
          <h1 className="section-title">Đặt hàng thành công</h1>
          <p style={{ color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-4)' }}>
            Đơn hàng của bạn đã được ghi nhận. Chúng tôi sẽ xác nhận và giao hàng trong thời gian sớm nhất.
          </p>
          <Link className="button button--primary" to="/">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)

  const handlePlaceOrder = () => {
    // Giao diện minh hoạ — chưa nối API /orders thật (Phase 2). Mô phỏng
    // đúng field trên Order: addressId, discountAmount=0 (chưa có voucher ở
    // giỏ hàng), Payment.method theo lựa chọn của khách.
    clearCart()
    setPlaced(true)
  }

  return (
    <div className="container">
      <div className="checkout-page">
        <div>
          <h1 className="section-title">Xác nhận đơn hàng</h1>

          <section className="checkout-section">
            <p className="checkout-section__title">Địa chỉ giao hàng</p>
            {SAMPLE_ADDRESSES.map((a) => (
              <label key={a.id} className={`radio-card${addressId === a.id ? ' radio-card--selected' : ''}`}>
                <input
                  type="radio"
                  name="address"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                <span>
                  <span className="radio-card__title">
                    {a.recipientName} · {a.phone}
                    {a.isDefault && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 99, padding: '1px 8px' }}>
                        Mặc định
                      </span>
                    )}
                  </span>
                  <span className="radio-card__desc" style={{ display: 'block' }}>{a.fullAddress}</span>
                </span>
              </label>
            ))}
          </section>

          <section className="checkout-section">
            <p className="checkout-section__title">Phương thức thanh toán</p>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className={`radio-card${paymentMethod === m.id ? ' radio-card--selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === m.id}
                  onChange={() => setPaymentMethod(m.id)}
                />
                <span>
                  <span className="radio-card__title">{m.title}</span>
                  <span className="radio-card__desc" style={{ display: 'block' }}>{m.desc}</span>
                </span>
              </label>
            ))}
          </section>

          <section className="checkout-section">
            <p className="checkout-section__title">Sản phẩm trong đơn ({lines.length})</p>
            {lines.map((l) => (
              <div className="checkout-line" key={l.productId}>
                <div className="checkout-line__media">
                  <ProductThumb seed={l.product.thumbSeed} productType={l.product.productType} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="checkout-line__name">{l.product.name}</p>
                  <p className="checkout-line__qty">Số lượng: {l.quantity}</p>
                </div>
                <strong style={{ fontSize: 13.5 }}>{formatVnd(l.product.price * l.quantity)}</strong>
              </div>
            ))}
          </section>
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
            <span>Tổng thanh toán</span>
            <span>{formatVnd(subtotal)}</span>
          </div>
          <button
            className="button button--primary"
            type="button"
            style={{ width: '100%', marginTop: 'var(--space-3)' }}
            onClick={handlePlaceOrder}
            disabled={!addressId}
          >
            Đặt hàng
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--color-muted-foreground)', textAlign: 'center', marginTop: 'var(--space-2)' }}>
            Giao diện minh hoạ — chưa nối API /orders thật (Phase 2).
          </p>
        </div>
      </div>
    </div>
  )
}
