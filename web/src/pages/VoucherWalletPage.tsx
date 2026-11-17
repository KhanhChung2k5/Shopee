import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import VoucherTicket from '../components/VoucherTicket'
import { Alert, Badge, ButtonLink, Card, EmptyState, Loading, Page, PageHeader } from '../components/ui'
import { apiFetch } from '../lib/api'
import { type AvailableVoucher } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'

export default function VoucherWalletPage() {
  const { isAuthenticated, isReady, token, user } = useAuth()
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadedAt, setLoadedAt] = useState(0)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    apiFetch<AvailableVoucher[]>('/vouchers', { signal: controller.signal }, token)
      .then((items) => { setVouchers(items); setLoadedAt(Date.now()) })
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
        subtitle="Ưu đãi của tôi. Bấm “Dùng ngay” để xem các sản phẩm được áp dụng."
        actions={!loading && <Badge tone="primary" className="!text-label-md px-space-sm py-1">{vouchers.length} voucher khả dụng</Badge>}
      />

      {loading && <Loading>Đang tải voucher…</Loading>}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && vouchers.length === 0 && (
        <Card><EmptyState icon="confirmation_number" title="Chưa có voucher" description="Hiện chưa có voucher khả dụng cho bạn." /></Card>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {vouchers.map((voucher) => (
          <li key={voucher.id}>
            <VoucherTicket
              voucher={voucher}
              now={loadedAt}
              action={<ButtonLink size="sm" to={`/kho-voucher/${voucher.id}`}>Dùng ngay</ButtonLink>}
            />
          </li>
        ))}
      </ul>
    </Page>
  )
}
