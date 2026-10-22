import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatVnd } from '../lib/catalog'
import ProductThumb from '../components/ProductThumb'
import { Alert, Button, ButtonLink, Card, EmptyState, Loading, Page, PageHeader, SummaryRow, cx } from '../components/ui'
import { useCart } from '../state/CartContext'

interface QuantityControlProps {
  lineId: string
  quantity: number
  busy: boolean
  available: boolean
  availableQuantity: number | null
  onCommit: (lineId: string, quantity: number) => Promise<void>
}

const stepClass = 'w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

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
    <div className="inline-flex items-center rounded-lg border border-line bg-surface-container-lowest overflow-hidden">
      <button type="button" className={stepClass} disabled={busy || !available || quantity <= 1} onClick={() => adjustQuantity(quantity - 1)} aria-label="Giảm số lượng">
        <span className="material-symbols-outlined text-base">remove</span>
      </button>
      <input
        className="w-12 h-8 text-center font-title-md text-title-md text-on-surface bg-transparent border-x border-line focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      <button type="button" className={stepClass} disabled={busy || !available || (availableQuantity !== null && quantity >= availableQuantity)} onClick={() => adjustQuantity(quantity + 1)} aria-label="Tăng số lượng">
        <span className="material-symbols-outlined text-base">add</span>
      </button>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { lines, setQuantity, removeItem, setSelected, isLoading, error, busyIds } = useCart()

  if (isLoading && lines.length === 0) {
    return <Page><Loading>Đang tải giỏ hàng…</Loading></Page>
  }

  if (lines.length === 0) {
    return (
      <Page narrow>
        {error && <Alert>{error}</Alert>}
        <Card>
          <EmptyState
            icon="remove_shopping_cart"
            title="Giỏ hàng của bạn đang trống"
            description="Khám phá tay cầm, đĩa game và phụ kiện chính hãng ngay hôm nay."
            action={<ButtonLink to="/" icon="storefront">Tiếp tục mua sắm</ButtonLink>}
          />
        </Card>
      </Page>
    )
  }

  const selectedLines = lines.filter((line) =>
    line.isSelected
      && line.available
      && (line.availableQuantity === null || line.quantity <= line.availableQuantity),
  )
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

  return (
    <Page>
      <PageHeader breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]} title={`Giỏ hàng (${lines.length})`} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <div className="lg:col-span-8 space-y-space-sm">
          {error && <Alert>{error}</Alert>}
          {lines.map((line) => {
            const busy = busyIds.has(line.id)
            const withinStock = line.availableQuantity === null || line.quantity <= line.availableQuantity
            return (
              <Card key={line.id} className={cx('flex flex-wrap sm:flex-nowrap items-start gap-space-md !p-space-md', !line.available && 'opacity-60')}>
                <input
                  className="mt-8 w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                  type="checkbox"
                  checked={line.isSelected && line.available && withinStock}
                  disabled={!line.available || !withinStock || busy}
                  onChange={(event) => void setSelected(line.id, event.target.checked)}
                  aria-label={`Chọn ${line.product.name}`}
                />
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-low">
                  <ProductThumb seed={line.product.thumbSeed} productType={line.product.productType} imageUrl={line.product.imageUrl} />
                </div>
                <div className="flex-1 min-w-0 space-y-space-xs">
                  <p className="font-title-md text-title-md text-on-surface line-clamp-2">{line.product.name}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">Đơn giá {formatVnd(line.product.price)}</p>
                  {!line.available && <p className="font-label-md text-label-md text-error">{line.availableQuantity === 0 ? 'Sản phẩm đã hết hàng' : 'Sản phẩm hiện không còn bán'}</p>}
                  <div className="flex flex-wrap items-center gap-space-sm">
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
                      <span className={cx('font-label-md text-label-md', line.quantity > line.availableQuantity ? 'text-error' : 'text-on-surface-variant')}>
                        Kho còn {line.availableQuantity} sản phẩm
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-space-sm pt-space-xs sm:pt-0 border-t sm:border-t-0 border-line">
                  <p className="font-price-md text-price-md text-primary whitespace-nowrap">{formatVnd(line.product.price * line.quantity)}</p>
                  <Button variant="ghost" size="sm" icon="delete" disabled={busy} onClick={() => void removeItem(line.id)}>Xoá</Button>
                </div>
              </Card>
            )
          })}
        </div>

        <Card as="aside" className="lg:col-span-4 lg:sticky lg:top-44 space-y-space-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface">Tóm tắt đơn hàng</h2>
          <SummaryRow label="Đã chọn" value={`${selectedLines.length} sản phẩm`} />
          <SummaryRow label="Tạm tính" value={formatVnd(subtotal)} />
          <SummaryRow label="Phí vận chuyển" value="Tính khi đặt hàng" />
          <SummaryRow strong label="Tổng cộng" value={formatVnd(subtotal)} />
          <Button size="lg" className="w-full mt-space-sm" icon="shopping_cart_checkout" onClick={() => navigate('/thanh-toan')} disabled={selectedLines.length === 0}>
            Tiến hành thanh toán
          </Button>
        </Card>
      </div>
    </Page>
  )
}
