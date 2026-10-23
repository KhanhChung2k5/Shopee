import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatVnd } from '../lib/catalog'
import ProductThumb from '../components/ProductThumb'
import { Alert, Button, ButtonLink, Card, EmptyState, Loading, Page, PageHeader, QtyStepper, SummaryRow, cx } from '../components/ui'
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
  return (
    <QtyStepper
      value={quantity}
      onChange={(next) => void onCommit(lineId, next)}
      max={availableQuantity}
      disabled={busy || !available}
      label="số lượng sản phẩm"
    />
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { lines, setQuantity, removeItem, removeSelected, setSelected, selectAll, isLoading, error, busyIds } = useCart()

  const selectAllRef = useRef<HTMLInputElement>(null)

  const selectableLines = lines.filter(
    (line) => line.available && (line.availableQuantity === null || line.quantity <= line.availableQuantity)
  )
  const allSelected = selectableLines.length > 0 && selectableLines.every((line) => line.isSelected)
  const isIndeterminate = selectableLines.some((line) => line.isSelected) && !allSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  if (isLoading && lines.length === 0) {
    return (
      <Page>
        <Loading>Đang tải giỏ hàng…</Loading>
      </Page>
    )
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

  const selectedLines = lines.filter(
    (line) =>
      line.isSelected &&
      line.available &&
      (line.availableQuantity === null || line.quantity <= line.availableQuantity)
  )
  const subtotal = selectedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]}
        title={`Giỏ hàng (${lines.length})`}
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <div className="lg:col-span-8 space-y-space-sm">
          {error && <Alert>{error}</Alert>}

          {/* Master Toolbar: Chọn tất cả & Xoá các sản phẩm đã chọn */}
          <Card className="flex flex-wrap items-center justify-between gap-space-sm !p-space-md bg-surface-container-low border border-line">
            <label className="flex items-center gap-space-sm cursor-pointer select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="w-4 h-4 accent-primary cursor-pointer"
                checked={allSelected}
                onChange={(event) => void selectAll(event.target.checked)}
                aria-label={`Chọn tất cả ${lines.length} sản phẩm`}
              />
              <span className="font-title-md text-title-md text-on-surface font-medium">
                Chọn tất cả ({lines.length} sản phẩm)
              </span>
            </label>

            <div className="flex items-center gap-space-sm">
              {selectedLines.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="delete_sweep"
                  className="text-error hover:bg-error-container/20 !px-space-sm"
                  onClick={() => void removeSelected()}
                >
                  Xóa ({selectedLines.length} sản phẩm đã chọn)
                </Button>
              )}
              {allSelected ? (
                <button
                  type="button"
                  className="text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  onClick={() => void selectAll(false)}
                >
                  Bỏ chọn tất cả
                </button>
              ) : (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline cursor-pointer"
                  onClick={() => void selectAll(true)}
                >
                  Chọn tất cả
                </button>
              )}
            </div>
          </Card>

          {/* Cart Item Cards */}
          {lines.map((line) => {
            const busy = busyIds.has(line.id)
            const withinStock = line.availableQuantity === null || line.quantity <= line.availableQuantity
            return (
              <Card
                key={line.id}
                className={cx(
                  'flex flex-wrap sm:flex-nowrap items-start gap-space-md !p-space-md transition-colors',
                  line.isSelected && line.available && withinStock && 'border-primary/40 bg-primary/5',
                  !line.available && 'opacity-60'
                )}
              >
                <input
                  className="mt-8 w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                  type="checkbox"
                  checked={line.isSelected && line.available && withinStock}
                  disabled={!line.available || !withinStock || busy}
                  onChange={(event) => void setSelected(line.id, event.target.checked)}
                  aria-label={`Chọn ${line.product.name}`}
                />
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-low">
                  <ProductThumb
                    seed={line.product.thumbSeed}
                    productType={line.product.productType}
                    imageUrl={line.product.imageUrl}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-space-xs">
                  <div className="flex items-center gap-2">
                    <p className="font-title-md text-title-md text-on-surface line-clamp-2">{line.product.name}</p>
                    {line.isSelected && line.available && withinStock && (
                      <span className="hidden sm:inline-block text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Đã chọn
                      </span>
                    )}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Đơn giá {formatVnd(line.product.price)}
                  </p>
                  {!line.available && (
                    <p className="font-label-md text-label-md text-error">
                      {line.availableQuantity === 0 ? 'Sản phẩm đã hết hàng' : 'Sản phẩm hiện không còn bán'}
                    </p>
                  )}
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
                      <span
                        className={cx(
                          'font-label-md text-label-md',
                          line.quantity > line.availableQuantity ? 'text-error' : 'text-on-surface-variant'
                        )}
                      >
                        Kho còn {line.availableQuantity} sản phẩm
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-space-sm pt-space-xs sm:pt-0 border-t sm:border-t-0 border-line">
                  <p className="font-price-md text-price-md text-primary whitespace-nowrap">
                    {formatVnd(line.product.price * line.quantity)}
                  </p>
                  <Button variant="ghost" size="sm" icon="delete" disabled={busy} onClick={() => void removeItem(line.id)}>
                    Xoá
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        <Card as="aside" className="lg:col-span-4 lg:sticky lg:top-44 space-y-space-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface">Tóm tắt đơn hàng</h2>
          <SummaryRow label="Đã chọn" value={`${selectedLines.length} / ${lines.length} sản phẩm`} />
          <SummaryRow label="Tạm tính" value={formatVnd(subtotal)} />
          <SummaryRow label="Phí vận chuyển" value="Tính khi đặt hàng" />
          <SummaryRow strong label="Tổng cộng" value={formatVnd(subtotal)} />
          <Button
            size="lg"
            className="w-full mt-space-sm"
            icon="shopping_cart_checkout"
            onClick={() => navigate('/thanh-toan')}
            disabled={selectedLines.length === 0}
          >
            Tiến hành thanh toán ({selectedLines.length})
          </Button>
        </Card>
      </div>
    </Page>
  )
}
