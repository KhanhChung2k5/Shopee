import { useEffect, useState } from 'react'
import { resolveCatalogImageUrl, type ProductType } from '../lib/catalog'

/** Shown when a product has no picture (or it fails to load) — never another product's image. */
const PLACEHOLDER_ICON: Record<ProductType, string> = {
  game_disc: 'album',
  controller: 'sports_esports',
  accessory: 'cable',
}

export default function ProductThumb({
  seed: _seed,
  productType = 'accessory',
  imageUrl,
  appearance: _appearance = 'default',
}: {
  seed: number
  productType?: ProductType
  imageUrl?: string
  appearance?: 'default' | 'detail'
}) {
  const resolvedImageUrl = resolveCatalogImageUrl(imageUrl)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [resolvedImageUrl])

  if (!resolvedImageUrl || imageFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-container-low text-on-surface-variant" aria-label="Chưa có ảnh sản phẩm">
        <span className="material-symbols-outlined text-5xl opacity-60">{PLACEHOLDER_ICON[productType] ?? 'image'}</span>
      </div>
    )
  }

  return (
    <img
      src={resolvedImageUrl}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  )
}
