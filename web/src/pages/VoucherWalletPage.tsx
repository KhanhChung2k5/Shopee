import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { formatVnd } from '../lib/catalog'
import { apiFetch } from '../lib/api'
import type { AvailableVoucher } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'

export default function VoucherWalletPage() {
  const { isAuthenticated, isReady, token, user } = useAuth()
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    apiFetch<AvailableVoucher[]>('/vouchers', { signal: controller.signal }, token)
      .then(setVouchers)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Không tải được voucher')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token])

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
        <span>{vouchers.length} voucher khả dụng</span>
      </header>

      {loading && <p>Đang tải voucher…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && vouchers.length === 0 && <p>Hiện chưa có voucher khả dụng cho bạn.</p>}

      <ul className="voucher-wallet-grid">
        {vouchers.map((voucher) => (
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
