import { useFavorites, type SavedProduct } from '../lib/savedProducts'

/** Heart toggle for a product. `floating` sits on top of a product image. */
export default function FavoriteButton({ product, floating, className = '' }: {
  product: Omit<SavedProduct, 'at'>
  floating?: boolean
  className?: string
}) {
  const { isFavorite, toggle } = useFavorites()
  const on = isFavorite(product.id)
  const label = on ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product) }}
      className={[
        'flex items-center justify-center rounded-full transition-colors cursor-pointer',
        floating ? 'w-9 h-9 bg-surface-container-lowest/90 shadow-sm hover:bg-surface-container-lowest' : 'w-11 h-11 border border-line hover:bg-surface-container',
        on ? 'text-error' : 'text-on-surface-variant hover:text-error',
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-xl" style={on ? { fontVariationSettings: "'FILL' 1" } : undefined}>favorite</span>
    </button>
  )
}
