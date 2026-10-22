import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Badge, Card, EmptyState, Loading, Page, PageHeader } from '../components/ui'
import { formatVnd } from '../lib/catalog'
import { apiFetch } from '../lib/api'
import type { AvailableVoucher } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'

export default function VoucherWalletPage() {
  const { isAuthenticated, isReady, token, user } = useAuth()
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

  if (!isReady) return <Page><Loading>Đang kiểm tra đăng nhập…</Loading></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: '/kho-voucher' }} />
  if (user?.role === 'staff') return <Navigate to="/admin/marketing" replace />

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Tài khoản', to: '/ho-so' }, { label: 'Kho Voucher' }]}
        title="Kho Voucher"
        subtitle="Ưu đãi của tôi"
        actions={!loading && <Badge tone="primary" className="!text-label-md px-space-sm py-1">{vouchers.length} voucher khả dụng</Badge>}
      />

      {loading && <Loading>Đang tải voucher…</Loading>}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && vouchers.length === 0 && (
        <Card><EmptyState icon="confirmation_number" title="Chưa có voucher" description="Hiện chưa có voucher khả dụng cho bạn." /></Card>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {vouchers.map((voucher) => (
          <li className="flex bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" key={voucher.id}>
            <div className="relative w-28 flex-shrink-0 flex flex-col items-center justify-center gap-1 p-space-sm bg-primary text-on-primary text-center">
              <span className="font-headline-md text-headline-md">{voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}</span>
              <span className="font-label-sm text-label-sm opacity-90 break-all">{voucher.code}</span>
              {/* ticket notches */}
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 p-space-md space-y-space-xs border-l-2 border-dashed border-line">
              <p className="font-title-md text-title-md text-on-surface line-clamp-2">{voucher.programName}</p>
              <p className="font-label-md text-label-md text-on-surface-variant">Hết hạn: {new Date(voucher.endsAt).toLocaleString('vi-VN')}</p>
              <Badge tone="success">Sẵn sàng sử dụng</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Page>
  )
}
