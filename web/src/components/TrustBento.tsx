import { useRevealOnScroll } from '../state/useRevealOnScroll'

const TILES = [
  {
    tone: 'primary',
    icon: 'M9 12.75 11.25 15 15 9.75M12 3l7.5 3v5.5c0 4.63-3.13 8.9-7.5 10-4.37-1.1-7.5-5.37-7.5-10V6l7.5-3Z',
    title: '100% Chính hãng',
    desc: 'Cam kết tay cầm & đĩa game nhập khẩu chính hãng, có tem bảo hành.',
  },
  {
    tone: 'accent',
    icon: 'M12 8v4l2.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    title: 'Bảo hành 12 tháng',
    desc: 'Đổi mới trong 7 ngày đầu nếu lỗi do nhà sản xuất.',
  },
  {
    tone: 'trust',
    icon: 'M3 7h11v9H3zM14 10h4l3 3v3h-7v-6ZM7 18a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM17.5 18a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
    title: 'Giao nhanh 2H',
    desc: 'Nội thành — đặt trước 17h nhận hàng trong ngày.',
  },
  {
    tone: 'urgent',
    icon: 'M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 14.4 3M19.5 9A8 8 0 0 0 5.1 6',
    title: 'Đổi trả dễ dàng',
    desc: 'Hoàn tiền vào ví trong 24h sau khi yêu cầu được duyệt.',
  },
]

export default function TrustBento() {
  const revealRef = useRevealOnScroll<HTMLUListElement>()

  return (
    <section className="section trust-section" aria-labelledby="trust-heading">
      <div className="container">
        <h2 id="trust-heading" className="section-title section-title--plain">Vì sao chọn Chợ Tốt Mua</h2>
        <ul className="trust-bento reveal-grid" ref={revealRef}>
          {TILES.map((t) => (
            <li key={t.title} className={`trust-tile trust-tile--${t.tone}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d={t.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <strong>{t.title}</strong>
              <span>{t.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
