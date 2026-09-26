import HeroCarousel from '../components/HeroCarousel'
import TrustBento from '../components/TrustBento'
import CategoryGrid from '../components/CategoryGrid'
import FlashSale from '../components/FlashSale'
import VoucherRow from '../components/VoucherRow'
import SuggestedProducts from '../components/SuggestedProducts'

export default function HomePage() {
  return (
    <>
      <section className="section hero-section" aria-label="Khuyến mãi nổi bật">
        <div className="container hero-grid">
          <HeroCarousel />
          <div className="hero-side">
            <a className="hero-tile hero-tile--voucher" href="#vouchers">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.16V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.64a1.6 1.6 0 0 0 0-3.16V9Z" stroke="currentColor" strokeWidth="1.6" /><path d="M14 7v10" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2" /></svg>
              <div><strong>Thành viên mới</strong><span>Nhận voucher 50K</span></div>
            </a>
            <a className="hero-tile hero-tile--app" href="#">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 18.2h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <div><strong>Tải ứng dụng</strong><span>Ưu đãi riêng trên app</span></div>
            </a>
          </div>
        </div>
      </section>

      <TrustBento />
      <CategoryGrid />
      <FlashSale />
      <VoucherRow />
      <SuggestedProducts />
    </>
  )
}
