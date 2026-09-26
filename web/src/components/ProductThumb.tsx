import { useId } from 'react'
import type { ProductType } from '../data/sampleProducts'

// Gradient + icon per product type, tinted with the brand's own palette
// (not generic stock colors) so cards read as "gaming storefront" at a
// glance instead of a bland placeholder block.
const GRADIENTS: Record<ProductType, [string, string]> = {
  controller: ['#3A2420', '#F0562E'],
  game_disc: ['#241A3A', '#7C5CFF'],
  accessory: ['#12332B', '#16A34A'],
}

const ICON_PATHS: Record<ProductType, string> = {
  controller: 'M28 40h1.5m-.75-.75v1.5M60.5 43h.01M67 34h.01M22 24h56a13 13 0 0 1 13 14.6l-4 27a10 10 0 0 1-17.4 4.4L64 60H36l-5.6 10a10 10 0 0 1-17.4-4.4l-4-27A13 13 0 0 1 22 24Z',
  game_disc: 'M50 88a38 38 0 1 0 0-76 38 38 0 0 0 0 76ZM50 63a13 13 0 1 0 0-26 13 13 0 0 0 0 26Z',
  accessory: 'M17 55v-4a33 33 0 0 1 66 0v4M17 55v21a8 8 0 0 0 8 8h4V54h-8a4 4 0 0 0-4 4ZM83 55v21a8 8 0 0 1-8 8h-4V54h8a4 4 0 0 1 4 4Z',
}

export default function ProductThumb({ seed, productType = 'accessory' }: { seed: number; productType?: ProductType }) {
  const gradientId = useId()
  const [from, to] = GRADIENTS[productType]
  const angle = 45 + (seed % 4) * 22

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Ảnh sản phẩm minh hoạ">
      <defs>
        <linearGradient id={gradientId} gradientTransform={`rotate(${angle})`}>
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradientId})`} />
      <circle cx="50" cy="46" r="30" fill="#fff" opacity="0.08" />
      <path
        d={ICON_PATHS[productType]}
        fill="none"
        stroke="#fff"
        strokeOpacity="0.92"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
