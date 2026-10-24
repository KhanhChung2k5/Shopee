import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { fetchProducts, formatVnd, resolveCatalogImageUrl, typeLabel } from '../lib/catalog'
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
      const sellers = await apiFetch<TopSeller[]>(`/api/products/top-sellers?limit=${SLIDE_COUNT}`).catch(() => [])
      if (sellers.length > 0) {
        return sellers.map((item, index): Slide => ({
          productId: item.productId,
          badge: `Bán chạy #${index + 1}`,
          title: item.name,
          desc: `Đã bán ${item.soldQuantity.toLocaleString('vi-VN')} sản phẩm${item.price != null ? ` · Giá từ ${formatVnd(item.price)}` : ''}`,
          image: resolveCatalogImageUrl(item.imageUrl),
        }))
      }
      const page = await fetchProducts(new URLSearchParams({ page: '0', size: String(SLIDE_COUNT) })).catch(() => null)
      return (page?.content ?? []).map((product): Slide => ({
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
  const silver = LOYALTY_TIERS.find((tier) => tier.code === 'silver')

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-stretch">
      <div className="lg:col-span-8 relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between min-h-[380px] p-space-xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        {slide?.image && (
          <img
            src={slide.image}
            alt=""
            className="absolute right-space-xl top-1/2 -translate-y-1/2 h-[85%] max-w-[40%] object-contain drop-shadow-xl transition-opacity duration-500 hidden sm:block"
          />
        )}

        <div className="relative z-20 max-w-lg space-y-space-md">
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
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight">{slide.title}</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant font-medium">{slide.desc}</p>
              </div>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                <Link
                  className="px-space-xl py-3 bg-primary hover:bg-primary-container text-on-primary font-title-lg text-title-lg rounded-lg shadow-md transition-all flex items-center gap-space-xs"
                  to={`/san-pham/${slide.productId}`}
                >
                  <span>Xem sản phẩm</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link
                  className="px-space-lg py-3 bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary font-title-lg text-title-lg rounded-lg shadow-sm transition-all flex items-center gap-space-xs"
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
          <div className="relative z-20 flex items-center gap-space-xs self-start pt-space-lg">
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

      <div className="lg:col-span-4 flex flex-col gap-gutter-desktop">
        <div className="flex-1 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between">
          <div className="space-y-space-xs">
            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded uppercase font-bold">
              Thành viên
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Tích điểm, lên hạng</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Mỗi 10.000đ trên đơn đã giao = 1 điểm. Lên hạng {silver?.label} từ {silver?.minPoints.toLocaleString('vi-VN')} điểm để nhận voucher dành riêng cho hạng.
            </p>
          </div>
          <a className="self-start text-primary font-title-md text-title-md flex items-center gap-1 hover:underline pt-space-sm" href="#gamer-club">
            <span>Xem các hạng thành viên</span>
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </a>
        </div>

        <div className="flex-1 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between">
          <div className="space-y-space-xs">
            <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm rounded uppercase font-bold">
              Mua sắm
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Miễn phí vận chuyển</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Áp dụng cho mọi đơn. Thanh toán khi nhận hàng hoặc chuyển khoản ngân hàng.
            </p>
          </div>
          <a className="self-start text-primary font-title-md text-title-md flex items-center gap-1 hover:underline pt-space-sm" href="#goi-y">
            <span>Mua sắm ngay</span>
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </a>
        </div>
      </div>
    </section>
  )
}
