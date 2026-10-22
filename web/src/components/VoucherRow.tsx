import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, buttonClass } from './ui'
import { formatVnd } from '../lib/catalog'
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

  // Staff accounts have no buyer vouchers — nothing useful to show them here.
  if (token && user?.role !== 'buyer') return null

  const loading = Boolean(token && result?.token !== token)
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
    <section id="vouchers" className="space-y-space-md scroll-mt-44" aria-labelledby="vouchers-heading">
      <div className="flex flex-wrap items-end justify-between gap-space-sm">
        <div>
          <h2 id="vouchers-heading" className="font-headline-lg text-headline-lg text-on-surface">Mã Giảm Giá Dành Cho Bạn</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Sao chép mã và áp dụng ở bước thanh toán</p>
        </div>
        {token && <Link className="font-title-md text-title-md text-primary flex items-center gap-1 hover:underline" to="/kho-voucher">
          Kho voucher <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>}
      </div>

      {!token && (
        <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-primary-fixed px-space-lg py-space-md">
          <p className="font-body-lg text-body-lg text-on-primary-fixed">Đăng nhập để xem voucher phù hợp với bạn.</p>
          <Link className={buttonClass('primary')} to="/dang-nhap">Đăng nhập</Link>
        </div>
      )}
      {token && loading && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải voucher…</p>}
      {token && error && <Alert>{error}</Alert>}
      {token && !loading && !error && vouchers.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">Hiện chưa có voucher khả dụng cho bạn.</p>
      )}
      {token && vouchers.length > 0 && (
        <ul className="flex gap-space-md overflow-x-auto pb-1 snap-x">
          {vouchers.map((voucher) => {
            const copied = copiedCode === voucher.code
            return (
              <li key={voucher.id} className="snap-start flex flex-shrink-0 w-80 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center gap-1 p-space-sm bg-primary text-on-primary text-center">
                  <span className="font-headline-md text-headline-md">
                    {voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}
                  </span>
                  <span className="font-label-sm text-label-sm opacity-90 break-all">{voucher.code}</span>
                </div>
                <div className="flex-1 min-w-0 p-space-md space-y-space-xs border-l-2 border-dashed border-line">
                  <p className="font-title-md text-title-md text-on-surface line-clamp-2">{voucher.programName}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</p>
                  <button
                    className={buttonClass(copied ? 'secondary' : 'outline', 'sm')}
                    type="button"
                    onClick={() => void copyCode(voucher.code)}
                  >
                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? 'Đã sao chép' : 'Sao chép mã'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
