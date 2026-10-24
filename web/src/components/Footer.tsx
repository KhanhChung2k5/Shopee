import { Link } from 'react-router-dom'
import ApiStatus from './ApiStatus'

/** Same real promises as the homepage TrustBento — nothing the shop does not actually do. */
const FOOTER_PROMISES = [
  { icon: 'local_shipping', title: 'Miễn Phí Vận Chuyển', desc: 'Áp dụng cho mọi đơn hàng' },
  { icon: 'payments', title: 'Thanh Toán Linh Hoạt', desc: 'COD hoặc chuyển khoản ngân hàng' },
  { icon: 'loyalty', title: 'Tích Điểm Thành Viên', desc: '1 điểm cho mỗi 10.000đ đơn đã giao' },
  { icon: 'support_agent', title: 'Hỗ Trợ Trực Tuyến', desc: 'Gửi yêu cầu tại trang Hỗ trợ' },
]

/** Every link goes to a page that exists in the app. */
const FOOTER_LINKS: { title: string; links: [string, string][] }[] = [
  { title: 'Hỗ Trợ Khách Hàng', links: [['Tra cứu đơn hàng', '/don-hang'], ['Gửi yêu cầu hỗ trợ', '/ho-tro'], ['Thông báo của tôi', '/thong-bao']] },
  { title: 'Tài Khoản & Ưu Đãi', links: [['Hồ sơ & điểm thành viên', '/ho-so'], ['Kho voucher', '/kho-voucher'], ['Giỏ hàng', '/gio-hang']] },
]

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest">
      <div className="bg-surface-container-low py-space-lg">
        <div className="max-w-[1280px] mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-space-lg">
          {FOOTER_PROMISES.map((item) => (
            <div key={item.title} className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-3xl text-primary">{item.icon}</span>
              <div>
                <p className="font-title-md text-title-md text-on-surface">{item.title}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-margin-desktop py-space-xl grid grid-cols-1 md:grid-cols-4 gap-space-xl">
        <div className="space-y-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
            </span>
            <span className="font-title-lg text-title-lg text-primary uppercase font-bold">CHỢ TỐT MUA</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Chợ Tốt Mua — cửa hàng tay cầm, đĩa game và phụ kiện cho game thủ PlayStation.
          </p>
          <div className="pt-2">
            <ApiStatus />
          </div>
        </div>

        {FOOTER_LINKS.map((column) => (
          <div key={column.title}>
            <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-md font-bold">{column.title}</h4>
            <ul className="space-y-space-sm font-body-md text-body-md text-on-surface-variant">
              {column.links.map(([label, to]) => (
                <li key={to}><Link className="hover:text-primary transition-colors" to={to}>{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-md font-bold">
            Phương Thức Thanh Toán
          </h4>
          <div className="grid grid-cols-3 gap-space-xs mb-space-md">
            {['Khi nhận hàng (COD)', 'Chuyển khoản'].map((method) => (
              <span key={method} className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
                {method}
              </span>
            ))}
          </div>

          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-sm font-bold">
            Vận Chuyển
          </h4>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Miễn phí vận chuyển mọi đơn. Đơn vị vận chuyển và mã vận đơn hiện trong chi tiết đơn hàng sau khi kho đóng gói.
          </p>
        </div>
      </div>

      <div className="bg-surface-container py-space-md text-center font-label-md text-label-md text-on-surface-variant">
        <div className="max-w-[1280px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-2">
          <span>
            © 2026 Chợ Tốt Mua Gaming Marketplace.
          </span>
          <span>Trụ sở: 180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh</span>
        </div>
      </div>
    </footer>
  )
}
