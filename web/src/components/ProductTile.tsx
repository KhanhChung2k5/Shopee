import { Link } from 'react-router-dom'
import ProductThumb from './ProductThumb'
import { formatPrice } from './ui'
import type { CatalogProductSummary } from '../lib/catalog'
import { useQuickAdd } from '../state/useQuickAdd'

/** Product card used by the homepage suggestions, category and search grids. */
export default function ProductTile({ product, index = 0 }: { product: CatalogProductSummary; index?: number }) {
  const { quickAdd, busyId } = useQuickAdd()
  const discount = product.price != null && product.comparePrice != null && product.comparePrice > product.price
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null
  const disabled = busyId === product.id || product.price == null

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between group relative">
      <div>
        <Link to={`/san-pham/${product.id}`} className="block">
          <div className="relative w-full aspect-square bg-surface-container-low rounded-lg overflow-hidden mb-space-sm">
            <div className="w-full h-full group-hover:scale-105 transition-transform duration-300">
              <ProductThumb seed={index} productType={product.productType} imageUrl={product.imageUrls?.[0]} />
            </div>
            {product.platforms?.[0] && (
              <span className="absolute top-2 left-2 bg-surface-container-highest text-on-surface font-label-sm text-label-sm px-1.5 py-0.5 rounded font-bold">
                {product.platforms[0]}
              </span>
            )}
            {discount != null && (
              <span className="absolute top-2 right-2 bg-primary text-on-primary font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded">
                -{discount}%
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-space-xs mb-1">
          <span className="px-1.5 py-0.5 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded font-semibold">
            Chính Hãng
          </span>
          <span className="px-1.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm rounded">
            Freeship Xtra
          </span>
        </div>

        <Link to={`/san-pham/${product.id}`}>
          <h3 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors mb-space-xs">
            {product.name}
          </h3>
        </Link>

        {/* Rating & Sold Count */}
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant mb-space-sm">
          <div className="flex items-center text-primary">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <span className="font-bold ml-0.5">{(4.8 + ((index * 3) % 3) * 0.1).toFixed(1)}</span>
          </div>
          <span>•</span>
          <span>Đã bán {((index * 400 + 950) / 1000).toFixed(1)}k</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-space-xs mb-space-sm">
          <span className="font-price-lg text-price-lg text-primary">{formatPrice(product.price)}</span>
          {discount != null && (
            <span className="font-label-sm text-label-sm text-outline line-through">{formatPrice(product.comparePrice)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              quickAdd(product.id, {
                startRect: rect,
                imageUrl: product.imageUrls?.[0],
                productName: product.name,
              })
            }}
            disabled={disabled}
            className="py-2 px-space-xs bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed font-title-md text-title-md rounded transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            type="button"
          >
            <span className="material-symbols-outlined text-base">add_shopping_cart</span>
            <span className="text-xs">Giỏ Hàng</span>
          </button>
          <button
            onClick={() => quickAdd(product.id, { goToCart: true, productName: product.name })}
            disabled={disabled}
            className="py-2 px-space-xs bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded transition-colors text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            type="button"
          >
            Mua Ngay
          </button>
        </div>
      </div>
    </div>
  )
}
