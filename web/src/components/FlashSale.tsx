import { useEffect, useState } from 'react'
import { FLASH_SALE_PRODUCTS } from '../data/sampleProducts'
import ProductCard from './ProductCard'
import { useRevealOnScroll } from '../state/useRevealOnScroll'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function useCountdown(hoursFromNow: number, minutesFromNow: number) {
  const [end] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + hoursFromNow, d.getMinutes() + minutesFromNow, 0, 0)
    return d
  })
  const [remaining, setRemaining] = useState(() => Math.max(0, end.getTime() - Date.now()))

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, end.getTime() - Date.now()))
    }, 1000)
    return () => window.clearInterval(id)
  }, [end])

  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return { h, m, s }
}

export default function FlashSale() {
  const { h, m, s } = useCountdown(3, 15)
  const revealRef = useRevealOnScroll<HTMLUListElement>()

  return (
    <section className="section flash-section" aria-labelledby="flash-heading">
      <div className="container">
        <div className="flash-header">
          <h2 id="flash-heading" className="flash-title">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-0.5-2-1-2 .3 2-1 3-2 3-1.5 0-2-1.4-1-3 .8-1.6 1-3.4 0-5-1 2-3 2.5-3 5 0 1.6.9 2.6 1.5 3.4C11 12 9 11 9 8c0-2 1.5-3.5 3-6Z" fill="currentColor" /></svg>
            <span>Flash Sale</span>
          </h2>
          <div className="flash-timer" role="timer" aria-live="off">
            <span className="flash-timer__label">Kết thúc trong</span>
            <span className="flash-timer__box">{pad(h)}</span>
            <span className="flash-timer__sep">:</span>
            <span className="flash-timer__box">{pad(m)}</span>
            <span className="flash-timer__sep">:</span>
            <span className="flash-timer__box">{pad(s)}</span>
          </div>
          <a className="section-link" href="#">Xem tất cả<span aria-hidden="true"> →</span></a>
        </div>

        <ul className="product-row reveal-grid" ref={revealRef}>
          {FLASH_SALE_PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
      </div>
    </section>
  )
}
