import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { resolveCatalogImageUrl, type ProductType } from '../lib/catalog'
import { useAuth } from '../state/AuthContext'
import { useQuickAdd } from '../state/useQuickAdd'

interface FlashSaleItem {
  id: string
  productId: string
  variantId: string
  sku: string
  productName: string
  productType: ProductType
  imageUrl: string | null
  originalPrice: number
  flashPrice: number
  soldQty: number
  limitQty: number
  endsAt: string
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function countdown(endMs: number, now: number) {
  const remaining = Math.max(0, endMs - now)
  return {
    hours: pad(Math.floor(remaining / 3600000)),
    minutes: pad(Math.floor((remaining % 3600000) / 60000)),
    seconds: pad(Math.floor((remaining % 60000) / 1000)),
  }
}

const DEFAULT_FLASH_ITEMS = [
  {
    id: 'fs-real-1',
    productId: '976110cc-8f9c-519e-91e1-1cfebf415135',
    productName: 'Tay Cầm DualSense - Chroma Pearl (Bộ Sưu Tập Đổi Màu)',
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c2-1.webp',
    originalPrice: 1590000,
    flashPrice: 1339900,
    soldPercent: 88,
    soldText: 'Đã bán 88%',
    stockText: 'Chỉ còn 6 cái',
    badge: 'Chính Hãng',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
  },
  {
    id: 'fs-real-2',
    productId: 'ed6de72d-7afd-5f30-bd3a-e4ad9db6411e',
    productName: 'Đĩa PS5 Astro Bot (Bản Vật Lý Chính Hãng Sealed)',
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d4-1.webp',
    originalPrice: 1790000,
    flashPrice: 1499000,
    soldPercent: 94,
    soldText: 'Đã bán 94%',
    stockText: 'Sắp Cháy Hàng',
    badge: 'HOT DEAL',
    badgeClass: 'bg-primary-fixed-dim text-on-primary-fixed',
  },
  {
    id: 'fs-real-3',
    productId: 'eb538024-56e6-5134-aef6-927c163ac9aa',
    productName: 'Đĩa PS5 Stellar Blade (Bản Đĩa Vật Lý Sealed 100%)',
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d5-1.webp',
    originalPrice: 1990000,
    flashPrice: 1799000,
    soldPercent: 75,
    soldText: 'Đã bán 75%',
    stockText: 'Còn 10 cái',
    badge: 'Bán Chạy',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
  },
  {
    id: 'fs-real-4',
    productId: 'da16eedf-0a60-525c-855c-6783bd9af2bb',
    productName: 'Tay Cầm Không Dây DualSense - Chroma Indigo',
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c1-1.webp',
    originalPrice: 2490000,
    flashPrice: 2299000,
    soldPercent: 82,
    soldText: 'Đã bán 82%',
    stockText: 'Còn 8 cái',
    badge: 'Chính Hãng',
    badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
  },
  {
    id: 'fs-real-5',
    productId: '916871f7-a4b6-51e6-afb8-fa8f8d9c6aef',
    productName: 'Đế Sạc Nhanh Cho Tay Cầm DualSense PS5',
    imageUrl:
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-a5-1.webp',
    originalPrice: 990000,
    flashPrice: 799000,
    soldPercent: 60,
    soldText: 'Đã bán 60%',
    stockText: 'Còn 15 cái',
    badge: 'Phụ Kiện',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
  },
]

export default function FlashSale() {
  const { token } = useAuth()
  const { quickAdd, busyId } = useQuickAdd()
  const [items, setItems] = useState<FlashSaleItem[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    apiFetch<FlashSaleItem[]>('/flash-sales', {}, token)
      .then((result) => { if (active) setItems(result) })
      .catch(() => { if (active) setItems([]) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const running = items.filter((item) => new Date(item.endsAt).getTime() > now)
  const defaultTargetTime = now + (2 * 3600 + 45 * 60 + 18) * 1000 - (now % (3 * 3600 * 1000))
  const nextEnd = running.length > 0
    ? Math.min(...running.map((item) => new Date(item.endsAt).getTime()))
    : defaultTargetTime
  const { hours, minutes, seconds } = countdown(nextEnd, now)

  return (
    <section id="flash-sale" className="rounded-xl overflow-hidden shadow-lg bg-surface-container-lowest scroll-mt-44">
      <div className="bg-gradient-to-r from-primary via-primary-container to-primary p-space-lg text-on-primary flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span
              className="material-symbols-outlined text-3xl animate-bounce"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span className="font-headline-lg text-headline-lg font-black tracking-wider uppercase">
              FLASH SALE GIỜ VÀNG
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-space-md" id="flash-sale-timer" role="timer" aria-live="off">
            <div className="bg-inverse-surface text-inverse-on-surface font-title-lg text-title-lg font-mono px-2 py-1 rounded shadow-inner">
              {hours}
            </div>
            <span className="font-bold text-lg">:</span>
            <div className="bg-inverse-surface text-inverse-on-surface font-title-lg text-title-lg font-mono px-2 py-1 rounded shadow-inner">
              {minutes}
            </div>
            <span className="font-bold text-lg">:</span>
            <div
              className="bg-inverse-surface text-inverse-on-surface font-title-lg text-title-lg font-mono px-2 py-1 rounded shadow-inner"
              id="timer-sec"
            >
              {seconds}
            </div>
          </div>
        </div>

        <span className="font-title-md text-title-md">Ưu đãi kết thúc sau</span>
      </div>

      <div className="p-space-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-md">
        {running.length > 0
          ? running.map((prod) => {
              const image = resolveCatalogImageUrl(prod.imageUrl)
              const discount = prod.originalPrice > prod.flashPrice
                ? Math.round((1 - prod.flashPrice / prod.originalPrice) * 100)
                : null
              const soldPercent = prod.limitQty > 0 ? Math.min(100, Math.round((prod.soldQty / prod.limitQty) * 100)) : 0
              const remaining = Math.max(0, prod.limitQty - prod.soldQty)
              return (
                <div
                  key={prod.id}
                  className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <Link to={`/san-pham/${prod.productId}`} className="block">
                    <div className="relative w-full aspect-square bg-surface-container-low rounded-lg overflow-hidden mb-space-sm">
                      {image ? (
                        <div
                          className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                          style={{ backgroundImage: `url('${image}')` }}
                        ></div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-5xl">image</span>
                        </div>
                      )}
                      {discount != null && (
                        <span className="absolute top-2 right-2 bg-primary text-on-primary font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded">
                          -{discount}%
                        </span>
                      )}
                      <span className="absolute top-2 left-2 font-label-sm text-label-sm px-1.5 py-0.5 rounded font-bold bg-secondary-container text-on-secondary-container">
                        Chính Hãng
                      </span>
                    </div>
                  </Link>

                  <div className="space-y-space-xs flex-1 flex flex-col justify-between">
                    <Link to={`/san-pham/${prod.productId}`}>
                      <h3 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                        {prod.productName}
                      </h3>
                    </Link>
                    <div className="space-y-1 pt-1">
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-price-lg text-price-lg text-primary">
                          ₫{prod.flashPrice.toLocaleString('vi-VN')}
                        </span>
                        {discount != null && (
                          <span className="font-label-sm text-label-sm text-outline line-through">
                            ₫{prod.originalPrice.toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="w-full bg-surface-container-highest rounded-full h-2.5 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${soldPercent}%` }}></div>
                        </div>
                        <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                          <span>Đã bán {prod.soldQty}/{prod.limitQty}</span>
                          <span className="text-primary font-bold">
                            {remaining === 0 ? 'Đã hết suất' : `Còn ${remaining} suất`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => quickAdd(prod.productId, { goToCart: true, variantId: prod.variantId })}
                    disabled={remaining === 0 || busyId === prod.productId}
                    className="mt-space-md w-full py-2 bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">shopping_bag</span>
                    <span>Mua Ngay</span>
                  </button>
                </div>
              )
            })
          : DEFAULT_FLASH_ITEMS.map((item) => {
              const discount = Math.round((1 - item.flashPrice / item.originalPrice) * 100)
              return (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <Link to={`/san-pham/${item.productId}`} className="block">
                    <div className="relative w-full aspect-square bg-surface-container-low rounded-lg overflow-hidden mb-space-sm">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                        style={{ backgroundImage: `url('${item.imageUrl}')` }}
                      ></div>
                      <span className="absolute top-2 right-2 bg-primary text-on-primary font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded">
                        -{discount}%
                      </span>
                      <span className={`absolute top-2 left-2 font-label-sm text-label-sm px-1.5 py-0.5 rounded font-bold ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    </div>
                  </Link>

                  <div className="space-y-space-xs flex-1 flex flex-col justify-between">
                    <Link to={`/san-pham/${item.productId}`}>
                      <h3 className="font-title-md text-title-md text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                        {item.productName}
                      </h3>
                    </Link>
                    <div className="space-y-1 pt-1">
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-price-lg text-price-lg text-primary">
                          ₫{item.flashPrice.toLocaleString('vi-VN')}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline line-through">
                          ₫{item.originalPrice.toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="w-full bg-surface-container-highest rounded-full h-2.5 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${item.soldPercent}%` }}></div>
                        </div>
                        <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                          <span>{item.soldText}</span>
                          <span className="text-primary font-bold">{item.stockText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => quickAdd(item.productId, { goToCart: true })}
                    disabled={busyId === item.productId}
                    className="mt-space-md w-full py-2 bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">shopping_bag</span>
                    <span>Mua Ngay</span>
                  </button>
                </div>
              )
            })}
      </div>
    </section>
  )
}
