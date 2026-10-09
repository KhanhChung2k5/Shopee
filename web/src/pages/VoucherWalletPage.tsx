import { Navigate, useNavigate } from 'react-router-dom'
import { VOUCHERS } from '../data/sampleProducts'
import { useAuth } from '../state/AuthContext'

/**
 * P3-DEMO-INTEGRATION-SEAM: this customer voucher wallet uses sample P4 data.
 * Replace VOUCHERS with the Marketing/Voucher API when P4 is merged.
 */
export default function VoucherWalletPage() {
  const { isAuthenticated, isReady, user } = useAuth()
  const navigate = useNavigate()

  if (!isReady) return <div className="container voucher-wallet-state">Đang kiểm tra đăng nhập…</div>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: '/kho-voucher' }} />
  if (user?.role === 'staff') return <Navigate to="/admin/marketing" replace />

  return (
    <div className="container voucher-wallet-page">
      <button className="voucher-wallet-back" type="button" onClick={() => navigate(-1)}>← Quay lại</button>
      <header className="voucher-wallet-heading">
        <div>
          <p>Ưu đãi của tôi</p>
          <h1>Kho Voucher</h1>
        </div>
        <span>{VOUCHERS.length} voucher khả dụng</span>
      </header>

      <div className="voucher-wallet-notice">
        Dữ liệu voucher đang được mô phỏng tạm thời. P4 có thể thay nguồn dữ liệu tại <code>VoucherWalletPage</code> mà không ảnh hưởng luồng đơn hàng P3.
      </div>

      <ul className="voucher-wallet-grid">
        {VOUCHERS.map((voucher) => (
          <li className={`voucher-card${voucher.isShipping ? ' voucher-card--ship' : ''}`} key={voucher.id}>
            <div className="voucher-card__value">
              {voucher.isShipping ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h11v9H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 10h4l3 3v3h-7v-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" /><circle cx="17.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" /></svg>
              ) : (
                <span className="voucher-card__amount">{voucher.amountLabel}</span>
              )}
              <span className="voucher-card__condition">{voucher.conditionLabel}</span>
            </div>
            <div className="voucher-card__body">
              <p className="voucher-card__name">{voucher.title}</p>
              <p className="voucher-card__expiry">{voucher.expiryLabel}</p>
              <span className="voucher-wallet-ready">Sẵn sàng sử dụng</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
