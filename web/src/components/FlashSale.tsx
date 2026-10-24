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
  // Only real, running flash-sale lines from /flash-sales; with none on, the homepage shows no Flash Sale block.
  if (running.length === 0) return null
  const nextEnd = Math.min(...running.map((item) => new Date(item.endsAt).getTime()))
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
        {running.map((prod) => {
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
            })}
      </div>
    </section>
  )
}
