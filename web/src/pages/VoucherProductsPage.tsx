import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import VoucherTicket from '../components/VoucherTicket'
import { Alert, Button, Card, EmptyState, Loading, Page, PageHeader } from '../components/ui'
import { apiFetch } from '../lib/api'
import type { CatalogProductSummary } from '../lib/catalog'
import { coversEveryProduct, fetchVoucherProducts, type AvailableVoucher } from '../lib/vouchers'
import { useAuth } from '../state/AuthContext'

const PAGE_SIZE = 20

/** /kho-voucher/:id — one voucher from the buyer's wallet and the products it can be used on. */
export default function VoucherProductsPage() {
  const { id = '' } = useParams()
  const { isAuthenticated, isReady, token, user } = useAuth()
  const [voucher, setVoucher] = useState<AvailableVoucher | null>(null)
  const [voucherState, setVoucherState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [products, setProducts] = useState<CatalogProductSummary[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  /** Last page that finished loading; while it lags behind {@code page}, products are loading. */
  const [loadedPage, setLoadedPage] = useState(-1)
  const [loadedAt, setLoadedAt] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    apiFetch<AvailableVoucher[]>('/vouchers', {}, token)
      .then((items) => {
        if (!active) return
        const found = items.find((item) => item.id === id) ?? null
        setVoucher(found)
        setLoadedAt(Date.now())
        setVoucherState(found ? 'ready' : 'missing')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Không tải được voucher')
        setVoucherState('error')
      })
    return () => { active = false }
  }, [token, id])

  useEffect(() => {
    if (!voucher) return
    let active = true
    fetchVoucherProducts(voucher, page, PAGE_SIZE)
      .then((result) => {
        if (!active) return
        setProducts((current) => (page === 0 ? result.content : [...current, ...result.content]))
        setTotalPages(result.totalPages)
        setTotalProducts(result.totalElements)
        setLoadedPage(page)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm')
        setLoadedPage(page)
      })
    return () => { active = false }
  }, [voucher, page])

  if (!isReady) return <Page><Loading>Đang kiểm tra đăng nhập…</Loading></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: `/kho-voucher/${id}` }} />
  if (user?.role === 'staff') return <Navigate to="/admin/marketing" replace />

  const productsLoading = Boolean(voucher) && loadedPage !== page

  const copyCode = async () => {
    if (!voucher) return
    try {
      await navigator.clipboard.writeText(voucher.code)
      setCopied(true)
    } catch {
      setError('Không sao chép được mã. Bạn có thể nhập mã hiển thị trên thẻ ở bước thanh toán.')
    }
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Tài khoản', to: '/ho-so' }, { label: 'Kho Voucher', to: '/kho-voucher' }, { label: voucher?.code ?? 'Voucher' }]}
        title="Sản phẩm áp dụng voucher"
        subtitle="Thêm sản phẩm vào giỏ, rồi nhập mã ở bước thanh toán."
      />

      {voucherState === 'loading' && <Loading>Đang tải voucher…</Loading>}
      {error && <Alert>{error}</Alert>}
      {voucherState === 'missing' && (
        <Card>
          <EmptyState icon="confirmation_number" title="Voucher không còn khả dụng"
            description="Voucher đã hết hạn, hết lượt hoặc bạn đã dùng hết số lượt của mình." />
        </Card>
      )}

      {voucher && (
        <div className="space-y-space-lg">
          <div className="max-w-xl">
            <VoucherTicket
              voucher={voucher}
              now={loadedAt}
              action={(
                <Button size="sm" variant={copied ? 'secondary' : 'outline'} icon={copied ? 'check' : 'content_copy'} onClick={() => void copyCode()}>
                  {copied ? 'Đã sao chép' : 'Sao chép mã'}
                </Button>
              )}
            />
          </div>

          <section className="space-y-space-md" aria-labelledby="voucher-products-heading">
            <div className="flex flex-wrap items-end justify-between gap-space-sm">
              <h2 id="voucher-products-heading" className="font-headline-md text-headline-md text-on-surface">
                {coversEveryProduct(voucher) ? 'Áp dụng cho mọi sản phẩm' : 'Sản phẩm được áp dụng'}
              </h2>
              {totalProducts > 0 && <span className="font-label-md text-label-md text-on-surface-variant">{totalProducts} sản phẩm</span>}
            </div>
            {productsLoading && page === 0 ? <Loading>Đang tải sản phẩm…</Loading> : <CatalogProductGrid products={products} />}
            {page + 1 < totalPages && (
              <div className="flex justify-center">
                <Button variant="outline" disabled={productsLoading} onClick={() => setPage((p) => p + 1)}>
                  {productsLoading ? 'Đang tải…' : 'Xem thêm sản phẩm'}
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  )
}
