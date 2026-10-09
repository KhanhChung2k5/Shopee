import { useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import ProductThumb from '../components/ProductThumb'
import { useCart } from '../state/CartContext'

interface QuantityControlProps {
  lineId: string
  quantity: number
  busy: boolean
  available: boolean
  availableQuantity: number | null
  onCommit: (lineId: string, quantity: number) => Promise<void>
}

function QuantityControl({ lineId, quantity, busy, available, availableQuantity, onCommit }: QuantityControlProps) {
  const [draft, setDraft] = useState(String(quantity))

  const commitDraft = () => {
    const nextQuantity = Number(draft)
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 1) {
      setDraft(String(quantity))
      return
    }
    const limitedQuantity = availableQuantity === null ? nextQuantity : Math.min(nextQuantity, availableQuantity)
    setDraft(String(limitedQuantity))
    if (limitedQuantity !== quantity) void onCommit(lineId, limitedQuantity)
  }

  const adjustQuantity = (nextQuantity: number) => {
    if (nextQuantity < 1 || (availableQuantity !== null && nextQuantity > availableQuantity)) return
    setDraft(String(nextQuantity))
    void onCommit(lineId, nextQuantity)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      setDraft(String(quantity))
      event.currentTarget.blur()
    }
  }

  return (
    <div className="qty-stepper">
      <button type="button" disabled={busy || !available || quantity <= 1} onClick={() => adjustQuantity(quantity - 1)} aria-label="Giảm số lượng">−</button>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max={availableQuantity ?? undefined}
        step="1"
        value={draft}
        disabled={busy || !available}
        aria-label="Số lượng sản phẩm"
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          if (nextValue === '' || /^\d+$/.test(nextValue)) setDraft(nextValue)
        }}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
      />
      <button type="button" disabled={busy || !available || (availableQuantity !== null && quantity >= availableQuantity)} onClick={() => adjustQuantity(quantity + 1)} aria-label="Tăng số lượng">+</button>
    </div>
  )
}

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

  const selectedLines = lines.filter((line) =>
    line.isSelected
      && line.available
      && (line.availableQuantity === null || line.quantity <= line.availableQuantity),
  )
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

  return (
    <div className="container">
      <div className="cart-page">
        <div>
          <h1 className="section-title">Giỏ hàng ({lines.length})</h1>
          {error && <p className="cart-message cart-message--error" role="alert">{error}</p>}
          {lines.map((line) => {
            const busy = busyIds.has(line.id)
            const withinStock = line.availableQuantity === null || line.quantity <= line.availableQuantity
            return (
              <div className={`cart-item${line.available ? '' : ' cart-item--unavailable'}`} key={line.id}>
                <label className="cart-item__select">
                  <input
                    type="checkbox"
                    checked={line.isSelected && line.available && withinStock}
                    disabled={!line.available || !withinStock || busy}
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
                  {!line.available && <p className="cart-item__status">{line.availableQuantity === 0 ? 'Sản phẩm đã hết hàng' : 'Sản phẩm hiện không còn bán'}</p>}
                  <QuantityControl
                    key={`${line.id}:${line.quantity}`}
                    lineId={line.id}
                    quantity={line.quantity}
                    busy={busy}
                    available={line.available}
                    availableQuantity={line.availableQuantity}
                    onCommit={setQuantity}
                  />
                  {line.availableQuantity !== null && (
                    <span className={`cart-item__stock${line.quantity > line.availableQuantity ? ' cart-item__stock--error' : ''}`}>
                      Kho còn {line.availableQuantity} sản phẩm
                    </span>
                  )}
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
