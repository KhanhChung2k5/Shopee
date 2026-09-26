import ApiStatus from './ApiStatus'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col">
          <h3>Chăm sóc khách hàng</h3>
          <ul>
            <li><a href="#">Trung tâm trợ giúp</a></li>
            <li><a href="#">Hướng dẫn mua hàng</a></li>
            <li><a href="#">Trả hàng &amp; Hoàn tiền</a></li>
            <li><a href="#">Liên hệ hỗ trợ</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>Về Chợ Tốt Mua</h3>
          <ul>
            <li><a href="#">Giới thiệu</a></li>
            <li><a href="#">Tuyển dụng</a></li>
            <li><a href="#">Điều khoản sử dụng</a></li>
            <li><a href="#">Chính sách bảo mật</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>Thanh toán</h3>
          <ul className="payment-icons">
            <li>COD</li>
            <li>Ví điện tử</li>
            <li>Thẻ ngân hàng</li>
            <li>Trả góp</li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>Kết nối với chúng tôi</h3>
          <div className="social-row">
            <a className="icon-button icon-button--ghost" href="#" aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 21v-7h2.4l.4-3H14V9c0-.9.3-1.5 1.6-1.5H17V5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2H8.5v3H11v7h3Z" fill="currentColor" /></svg></a>
            <a className="icon-button icon-button--ghost" href="#" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17" cy="7" r="1" fill="currentColor" /></svg></a>
            <a className="icon-button icon-button--ghost" href="#" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="1.7" /><path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" /></svg></a>
          </div>
          <p className="footer-note">Tải ứng dụng để nhận thêm ưu đãi</p>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; 2026 Chợ Tốt Mua. Thiết kế minh hoạ — dữ liệu và hình ảnh trong trang là dữ liệu mẫu.</p>
          <ApiStatus />
        </div>
      </div>
    </footer>
  )
}
