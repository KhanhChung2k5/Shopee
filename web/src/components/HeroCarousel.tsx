import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, fetchTopSellers, formatVnd, resolveCatalogImageUrl, typeLabel } from '../lib/catalog'
import { LOYALTY_TIERS } from '../lib/loyalty'

interface Slide {
  productId: string
  badge: string
  title: string
  desc: string
  image: string | undefined
}

interface TopSeller {
  productId: string
  name: string
  price: number | null
  soldQuantity: number
  imageUrl: string | null
}

const SLIDE_COUNT = 3

/** Medal colour per loyalty tier, for the membership card. */
const TIER_COLOR: Record<string, string> = {
  bronze: 'linear-gradient(135deg, #D08A4E, #8C4B1F)',
  silver: 'linear-gradient(135deg, #D9DEE5, #8A94A3)',
  gold: 'linear-gradient(135deg, #FFD54A, #C99400)',
  diamond: 'linear-gradient(135deg, #8EE8FF, #2D7DD2)',
}

/**
 * Homepage hero built from real catalogue data: the best sellers (GET /api/products/top-sellers), or the
 * newest published products while nothing has sold yet. The side cards state the shop's actual rules
 * (loyalty tiers, free shipping, payment methods) — no invented promotions.
 */
export default function HeroCarousel() {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      const sellers: TopSeller[] = await fetchTopSellers(SLIDE_COUNT).catch(() => [])
      if (sellers.length > 0) {
        return sellers.map((item, index): Slide => ({
          productId: item.productId,
          badge: `Bán chạy #${index + 1}`,
          title: item.name,
          desc: `Đã bán ${item.soldQuantity.toLocaleString('vi-VN')} sản phẩm${item.price != null ? ` · Giá từ ${formatVnd(item.price)}` : ''}`,
          image: resolveCatalogImageUrl(item.imageUrl),
        }))
      }
      // Same request as the suggestions grid below (served once from the shared cache), first few products only.
      const page = await fetchProducts(new URLSearchParams({ page: '0', size: '100' })).catch(() => null)
      return (page?.content ?? []).slice(0, SLIDE_COUNT).map((product): Slide => ({
        productId: product.id,
        badge: typeLabel[product.productType] ?? 'Sản phẩm',
        title: product.name,
        desc: product.price != null ? `Giá ${formatVnd(product.price)}` : 'Xem chi tiết sản phẩm',
        image: resolveCatalogImageUrl(product.imageUrls?.[0]),
      }))
    }
    load().then((list) => { if (active) setSlides(list) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!slides || slides.length < 2) return
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % slides.length), 5000)
    return () => clearInterval(timer)
  }, [slides])

  const slide = slides?.[current % (slides.length || 1)]

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-stretch">
      <div className="lg:col-span-8 relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between min-h-[250px] px-space-xl py-space-lg">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        {slide?.image && (
          <img
            src={slide.image}
            alt=""
            className="absolute right-space-xl top-1/2 -translate-y-1/2 h-[88%] max-w-[38%] object-contain drop-shadow-xl transition-opacity duration-500 hidden sm:block"
          />
        )}

        <div className="relative z-20 max-w-lg space-y-space-sm">
          {!slides && <div className="h-40 rounded-lg bg-surface-container-low animate-pulse" />}
          {slides && slides.length === 0 && (
            <h1 className="font-headline-xl text-headline-xl text-on-surface">Chợ Tốt Mua — gaming gear &amp; đĩa game chính hãng</h1>
          )}
          {slide && (
            <>
              <div className="inline-flex items-center gap-space-xs px-2.5 py-1 bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider rounded-full shadow-sm">
                <span className="material-symbols-outlined text-sm">local_fire_department</span>
                <span>{slide.badge}</span>
              </div>
              <div className="space-y-space-xs">
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight">{slide.title}</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant font-medium">{slide.desc}</p>
              </div>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                <Link
                  className="px-space-lg py-2.5 bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md rounded-lg shadow-md transition-all flex items-center gap-space-xs"
                  to={`/san-pham/${slide.productId}`}
                >
                  <span>Xem sản phẩm</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link
                  className="px-space-md py-2.5 bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary font-title-md text-title-md rounded-lg shadow-sm transition-all flex items-center gap-space-xs"
                  to="/kho-voucher"
                >
                  <span className="material-symbols-outlined text-lg">confirmation_number</span>
                  <span>Kho voucher của tôi</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {slides && slides.length > 1 && (
          <div className="relative z-20 flex items-center gap-space-xs self-start pt-space-sm">
            {slides.map((s, idx) => (
              <button
                key={s.productId}
                type="button"
                onClick={() => setCurrent(idx)}
                className={`rounded-full transition-all cursor-pointer ${
                  idx === current % slides.length ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-surface-container-highest hover:bg-primary/50'
                }`}
                aria-label={`Chuyển đến banner ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Side cards: a picture first and a few words, not paragraphs (the whole card is the link). */}
      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-space-md">
        <a href="#gamer-club"
          className="group relative overflow-hidden rounded-xl px-space-lg py-space-md shadow-sm min-h-[117px] flex flex-col justify-between bg-gradient-to-br from-[#FFF4D6] via-[#FFE7A8] to-[#F6C453] text-[#4A3300] hover:shadow-md transition-shadow">
          <div className="relative z-10">
            <h3 className="font-headline-md text-headline-md leading-tight">Tích điểm, lên hạng</h3>
            <div className="mt-0.5 font-title-md text-title-md">1 điểm / 10.000đ</div>
          </div>
          {/* The four tiers as medals: the picture says "climb the ranks" without a sentence. */}
          <div className="relative z-10 flex items-end gap-2 mt-space-xs">
            {LOYALTY_TIERS.map((tier, i) => (
              <div key={tier.code} className="flex flex-col items-center" title={`Hạng ${tier.label}`}>
                <span className="rounded-full flex items-center justify-center shadow-md ring-2 ring-white/70 group-hover:-translate-y-0.5 transition-transform"
                  style={{ width: 28 + i * 5, height: 28 + i * 5, background: TIER_COLOR[tier.code] }}>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 15 + i * 3, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                </span>
                <span className="mt-1 font-label-sm text-label-sm font-bold">{tier.label}</span>
              </div>
            ))}
            <span className="material-symbols-outlined ml-auto self-center text-3xl opacity-70 group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </a>

        <a href="#goi-y"
          className="group relative overflow-hidden rounded-xl px-space-lg py-space-md shadow-sm min-h-[117px] flex flex-col justify-between bg-gradient-to-br from-[#E3F2FF] via-[#C9E4FF] to-[#8EC5FF] text-[#0B2A4A] hover:shadow-md transition-shadow">
          <div className="relative z-10 max-w-[58%]">
            <div className="font-headline-lg text-headline-lg font-black leading-none tracking-tight">FREESHIP</div>
            <div className="mt-1 font-title-md text-title-md">Mọi đơn hàng · COD</div>
          </div>
          <span className="material-symbols-outlined relative z-10 text-[#0B4F8A] group-hover:translate-x-1 transition-transform" style={{ fontSize: 38, fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
          {/* Real best-sellers on the right, each on a white card so photos with a white background look intentional. */}
          <div className="absolute right-3 inset-y-3 w-[40%] pointer-events-none">
            {(slides ?? []).filter((s) => s.image).slice(0, 2).map((s, i) => (
              <div key={s.productId}
                className="absolute bottom-0 w-[66%] aspect-[4/5] rounded-lg bg-white shadow-lg p-1 transition-transform duration-300 group-hover:-translate-y-1"
                style={{ right: i === 0 ? 0 : '30%', zIndex: 2 - i, rotate: `${i === 0 ? 5 : -7}deg` }}>
                <img src={s.image} alt="" className="w-full h-full object-contain scale-110" />
              </div>
            ))}
          </div>
        </a>
      </div>
    </section>
  )
}
