import { useEffect, useRef, useState } from 'react'
import { BANNER_SLIDES } from '../data/sampleProducts'

const AUTOPLAY_MS = 5000

const DECOR_ICONS: Record<string, string> = {
  a: 'M28 40h1.5m-.75-.75v1.5M60.5 43h.01M67 34h.01M22 24h56a13 13 0 0 1 13 14.6l-4 27a10 10 0 0 1-17.4 4.4L64 60H36l-5.6 10a10 10 0 0 1-17.4-4.4l-4-27A13 13 0 0 1 22 24Z',
  b: 'M17 55v-4a33 33 0 0 1 66 0v4M17 55v21a8 8 0 0 0 8 8h4V54h-8a4 4 0 0 0-4 4ZM83 55v21a8 8 0 0 1-8 8h-4V54h8a4 4 0 0 1 4 4Z',
  c: 'M50 88a38 38 0 1 0 0-76 38 38 0 0 0 0 76ZM50 63a13 13 0 1 0 0-26 13 13 0 0 0 0 26Z',
}

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const intervalRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = window.setInterval(() => {
      setCurrent((c) => (c + 1) % BANNER_SLIDES.length)
    }, AUTOPLAY_MS)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [playing])

  useEffect(() => {
    const onVisibility = () => setPlaying(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const goTo = (index: number) => setCurrent((index + BANNER_SLIDES.length) % BANNER_SLIDES.length)

  const activeVariant = BANNER_SLIDES[current].variant

  return (
    <div className="hero-visual">
    <div
      className="carousel"
      id="hero-carousel"
      ref={rootRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Banner khuyến mãi"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(!document.hidden)}
      onFocus={() => setPlaying(false)}
      onBlur={() => setPlaying(!document.hidden)}
    >
      <div className="carousel__viewport">
        <ul className="carousel__track" style={{ transform: `translateX(-${current * 100}%)` }}>
          {BANNER_SLIDES.map((slide, i) => (
            <li className="carousel__slide" key={slide.title} aria-hidden={i !== current}>
              <div className={`carousel__slide-bg carousel__slide-bg--${slide.variant}`}>
                <svg className="carousel__decor" viewBox="0 0 100 100" aria-hidden="true">
                  <path d={DECOR_ICONS[slide.variant]} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="carousel__copy">
                  <p className="carousel__eyebrow">{slide.eyebrow}</p>
                  <h2>{slide.title}</h2>
                  <p className="carousel__desc">{slide.description}</p>
                  <a className="button button--light" href={slide.ctaHref}>{slide.ctaLabel}</a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button className="carousel__control carousel__control--prev" type="button" aria-label="Banner trước" onClick={() => goTo(current - 1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button className="carousel__control carousel__control--next" type="button" aria-label="Banner tiếp theo" onClick={() => goTo(current + 1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button
        className="carousel__playpause"
        type="button"
        data-playing={playing}
        aria-label={playing ? 'Tạm dừng tự động chuyển banner' : 'Tiếp tục tự động chuyển banner'}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="carousel__dots" role="tablist" aria-label="Chọn banner">
        {BANNER_SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Đi tới banner ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <div className="carousel__stat-badge" aria-hidden="true">
        <strong>50K+</strong>
        <span>khách hàng tin dùng</span>
      </div>
      <div className="carousel__rating-badge" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 16.9l-5.2 2.9 1-5.9-4.3-4.2 5.9-.8L12 3.5Z" /></svg>
        <strong>4.8</strong>
        <span>· 12K+ đánh giá</span>
      </div>
    </div>

    <div className="hero-visual__coin" aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 100 100">
        <path d={DECOR_ICONS[activeVariant]} fill="none" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    </div>
  )
}
