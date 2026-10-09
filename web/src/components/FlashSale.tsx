import { useEffect, useState } from 'react'
import { formatVnd, type ProductType } from '../data/sampleProducts'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/AuthContext'
import ProductThumb from './ProductThumb'

interface FlashSaleItem {
  id: string
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
  const requestKey = token ?? 'guest'
  const [result, setResult] = useState<{ key: string; items: FlashSaleItem[]; error: string } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    apiFetch<FlashSaleItem[]>('/flash-sales', {}, token)
      .then((items) => { if (active) setResult({ key: requestKey, items, error: '' }) })
      .catch((reason: unknown) => {
        if (active) setResult({ key: requestKey, items: [], error: reason instanceof Error ? reason.message : 'Không tải được Flash Sale' })
      })
    return () => { active = false }
  }, [requestKey, token])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const loading = result?.key !== requestKey
  const error = result?.key === requestKey ? result.error : ''
  const items = result?.key === requestKey
    ? result.items.filter((item) => new Date(item.endsAt).getTime() > now)
    : []
  const nextEnd = items.reduce<number | null>((earliest, item) => {
    const endMs = new Date(item.endsAt).getTime()
    return earliest === null || endMs < earliest ? endMs : earliest
  }, null)
  const time = nextEnd === null ? null : countdown(nextEnd, now)

  return (
    <section className="section flash-section" aria-labelledby="flash-heading">
      <div className="container">
        <div className="flash-header">
          <h2 id="flash-heading" className="flash-title">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-0.5-2-1-2 .3 2-1 3-2 3-1.5 0-2-1.4-1-3 .8-1.6 1-3.4 0-5-1 2-3 2.5-3 5 0 1.6.9 2.6 1.5 3.4C11 12 9 11 9 8c0-2 1.5-3.5 3-6Z" fill="currentColor" /></svg>
            <span>Flash Sale</span>
          </h2>
          {time && (
            <div className="flash-timer" role="timer" aria-live="off">
              <span className="flash-timer__label">Ưu đãi gần nhất kết thúc trong</span>
              <span className="flash-timer__box">{time.hours}</span>
              <span className="flash-timer__sep">:</span>
              <span className="flash-timer__box">{time.minutes}</span>
              <span className="flash-timer__sep">:</span>
              <span className="flash-timer__box">{time.seconds}</span>
            </div>
          )}
        </div>

        {loading && <p>Đang tải Flash Sale…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && <p>Hiện chưa có Flash Sale đang diễn ra.</p>}
        {items.length > 0 && (
          <ul className="product-row">
            {items.map((item) => {
              const soldPercent = Math.min(100, Math.round(item.soldQty / item.limitQty * 100))
              const discountPercent = Math.round((1 - item.flashPrice / item.originalPrice) * 100)
              const remaining = countdown(new Date(item.endsAt).getTime(), now)
              return (
                <li className="product-card" key={item.id}>
                  <div className="product-card__media">
                    <span className="product-card__badge">-{discountPercent}%</span>
                    <ProductThumb seed={0} productType={item.productType} imageUrl={item.imageUrl ?? undefined} />
                  </div>
                  <div className="product-card__body">
                    <p className="product-card__name">{item.productName}</p>
                    <p className="flash-sale__sku">SKU: {item.sku}</p>
                    <div className="product-card__price-row">
                      <span className="product-card__price">{formatVnd(item.flashPrice)}</span>
                      <span className="product-card__compare">{formatVnd(item.originalPrice)}</span>
                    </div>
                    <div className="product-card__progress">
                      <div className="product-card__progress-fill" style={{ width: `${soldPercent}%` }} />
                    </div>
                    <p className="product-card__sold">Đã bán {item.soldQty}/{item.limitQty}</p>
                    <p className="flash-sale__ends">Còn {remaining.hours}:{remaining.minutes}:{remaining.seconds}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
