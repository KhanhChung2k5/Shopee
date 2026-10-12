import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { formatVnd, VOUCHERS } from '../data/sampleProducts'
import { isP3DemoMode } from '../demo/p3DemoApi'
import { apiFetch } from '../lib/api'
import type { AvailableVoucher } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'

export default function VoucherWalletPage() {
  const { isAuthenticated, isReady, token, user } = useAuth()
  const navigate = useNavigate()
  const demoMode = isP3DemoMode()
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || demoMode) return
    const controller = new AbortController()
    apiFetch<AvailableVoucher[]>('/vouchers', { signal: controller.signal }, token)
      .then(setVouchers)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Không tải được voucher')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [demoMode, token])

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
        <span>{demoMode ? VOUCHERS.length : vouchers.length} voucher khả dụng</span>
      </header>

      {!demoMode && loading && <p>Đang tải voucher…</p>}
      {!demoMode && error && <p role="alert">{error}</p>}
      {!demoMode && !loading && !error && vouchers.length === 0 && <p>Hiện chưa có voucher khả dụng cho bạn.</p>}

      <ul className="voucher-wallet-grid">
        {demoMode ? VOUCHERS.map((voucher) => (
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
        )) : vouchers.map((voucher) => (
          <li className="voucher-card" key={voucher.id}>
            <div className="voucher-card__value">
              <span className="voucher-card__amount">{voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}</span>
              <span className="voucher-card__condition">Mã: {voucher.code}</span>
            </div>
            <div className="voucher-card__body">
              <p className="voucher-card__name">{voucher.programName}</p>
              <p className="voucher-card__expiry">Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</p>
              <span className="voucher-wallet-ready">Sẵn sàng sử dụng</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
