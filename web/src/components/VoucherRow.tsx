import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVnd } from '../data/sampleProducts'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/AuthContext'

interface AvailableVoucher {
  id: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: number
  programName: string
  endsAt: string
}

export default function VoucherRow() {
  const { token, user } = useAuth()
  const [result, setResult] = useState<{ token: string; vouchers: AvailableVoucher[]; error: string } | null>(null)
  const [copyError, setCopyError] = useState('')
  const [copiedCode, setCopiedCode] = useState('')

  useEffect(() => {
    if (!token || user?.role !== 'buyer') return
    let active = true
    apiFetch<AvailableVoucher[]>('/vouchers', {}, token)
      .then((items) => { if (active) setResult({ token, vouchers: items, error: '' }) })
      .catch((reason: unknown) => {
        if (active) setResult({ token, vouchers: [], error: reason instanceof Error ? reason.message : 'Không tải được voucher' })
      })
    return () => { active = false }
  }, [token, user?.role])

  const loading = Boolean(token && user?.role === 'buyer' && result?.token !== token)
  const vouchers = result?.token === token ? result.vouchers : []
  const error = (result?.token === token ? result.error : '') || copyError

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyError('')
      setCopiedCode(code)
    } catch {
      setCopyError('Không sao chép được mã. Bạn có thể chọn và sao chép mã hiển thị trên thẻ.')
    }
  }

  return (
    <section id="vouchers" className="section" aria-labelledby="vouchers-heading">
      <div className="container">
        <h2 id="vouchers-heading" className="section-title section-title--plain">Mã giảm giá dành cho bạn</h2>
        {!token && <p><Link to="/dang-nhap">Đăng nhập</Link> để xem voucher phù hợp với bạn.</p>}
        {token && user?.role === 'buyer' && loading && <p>Đang tải voucher…</p>}
        {token && user?.role === 'buyer' && error && <p role="alert">{error}</p>}
        {token && user?.role === 'buyer' && !loading && !error && vouchers.length === 0 && (
          <p>Hiện chưa có voucher khả dụng cho bạn.</p>
        )}
        {token && user?.role === 'buyer' && vouchers.length > 0 && (
          <ul className="voucher-row">
            {vouchers.map((voucher) => (
              <li key={voucher.id} className="voucher-card">
                <div className="voucher-card__value">
                  <span className="voucher-card__amount">
                    {voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}
                  </span>
                  <span className="voucher-card__condition">Mã: {voucher.code}</span>
                </div>
                <div className="voucher-card__body">
                  <p className="voucher-card__name">{voucher.programName}</p>
                  <p className="voucher-card__expiry">Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</p>
                  <button className="button button--outline button--sm voucher-save" type="button"
                    data-saved={copiedCode === voucher.code} onClick={() => void copyCode(voucher.code)}>
                    {copiedCode === voucher.code ? 'Đã sao chép' : 'Sao chép mã'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
