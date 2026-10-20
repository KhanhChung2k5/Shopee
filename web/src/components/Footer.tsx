import { Link } from 'react-router-dom'
import ApiStatus from './ApiStatus'

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest">
      <div className="bg-surface-container-low py-space-lg">
        <div className="max-w-[1280px] mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-space-lg">
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-3xl text-primary">verified</span>
            <div>
              <p className="font-title-md text-title-md text-on-surface">100% Chính Hãng</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Cam kết hoàn tiền 200% nếu phát hiện giả
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-3xl text-primary">sync_alt</span>
            <div>
              <p className="font-title-md text-title-md text-on-surface">Đổi Trả Trong 7 Ngày</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Thủ tục đơn giản, 1 đổi 1 tận nơi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-3xl text-primary">rocket_launch</span>
            <div>
              <p className="font-title-md text-title-md text-on-surface">Giao Hỏa Tốc 2H</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Nội thành TP.HCM &amp; Hà Nội nhận ngay
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-3xl text-primary">support_agent</span>
            <div>
              <p className="font-title-md text-title-md text-on-surface">Hỗ Trợ Game Thủ 24/7</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Tư vấn máy, fix lỗi cài đặt tận tâm
              </p>
            </div>
          </div>
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
            Chợ Tốt Mua - Hệ thống bán lẻ tay cầm &amp; đĩa game bản quyền số 1 Việt Nam. Điểm đến tin cậy
            của cộng đồng PlayStation, Nintendo Switch và Xbox.
          </p>
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-xl text-on-surface-variant">verified_user</span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Chứng nhận sàn TMĐT uy tín bởi Bộ Công Thương
            </span>
          </div>
          <div className="pt-2">
            <ApiStatus />
          </div>
        </div>

        <div>
          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-md font-bold">
            Hỗ Trợ Khách Hàng
          </h4>
          <ul className="space-y-space-sm font-body-md text-body-md text-on-surface-variant">
            <li>
              <Link className="hover:text-primary transition-colors" to="/don-hang">
                Hướng dẫn mua hàng từ xa
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors" to="/don-hang">
                Tra cứu tình trạng vận đơn
              </Link>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Hướng dẫn thanh toán trả góp 0%
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Quy định đóng gói chống sốc linh kiện
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Giải quyết khiếu nại &amp; bồi thường
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-md font-bold">
            Chính Sách &amp; Dịch Vụ
          </h4>
          <ul className="space-y-space-sm font-body-md text-body-md text-on-surface-variant">
            <li>
              <a className="hover:text-primary transition-colors" href="#cam-ket">
                Chính sách bảo hành 1 đổi 1 trong 12 tháng
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="/kho-voucher">
                Chính sách voucher &amp; tích điểm Gamer Club
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Chính sách bảo mật thông tin cá nhân
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Điều khoản hoạt động sàn Chợ Tốt Mua
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Quy chế kiểm duyệt linh kiện bóc máy
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-md font-bold">
            Phương Thức Thanh Toán
          </h4>
          <div className="grid grid-cols-3 gap-space-xs mb-space-md">
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              MoMo
            </span>
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              ZaloPay
            </span>
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              VNPAY
            </span>
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              Visa
            </span>
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              Mastercard
            </span>
            <span className="px-2 py-1.5 bg-surface-container rounded font-label-sm text-label-sm text-center text-on-surface">
              Trả góp 0%
            </span>
          </div>

          <h4 className="font-title-md text-title-md text-on-surface uppercase mb-space-sm font-bold">
            Đơn Vị Vận Chuyển
          </h4>
          <div className="flex flex-wrap gap-space-xs">
            <span className="px-2 py-1 bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface-variant">
              Giao Hàng Nhanh
            </span>
            <span className="px-2 py-1 bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface-variant">
              Viettel Post
            </span>
            <span className="px-2 py-1 bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface-variant">
              SPX Express
            </span>
            <span className="px-2 py-1 bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface-variant">
              GrabExpress 2H
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container py-space-md text-center font-label-md text-label-md text-on-surface-variant">
        <div className="max-w-[1280px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-2">
          <span>
            © 2025 Chợ Tốt Mua Gaming Marketplace. Giấy phép cung cấp dịch vụ TMĐT số 031489201.
          </span>
          <span>Trụ sở: 180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh</span>
        </div>
      </div>
    </footer>
  )
}
