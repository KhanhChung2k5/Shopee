import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { apiFetch } from '../../lib/api'
import ProgramManager from '../marketing/ProgramManager'
import VoucherManager from '../marketing/VoucherManager'
import ProductDiscountManager from '../marketing/ProductDiscountManager'
import InvoiceDiscountManager from '../marketing/InvoiceDiscountManager'
import type { PromotionProgram, Voucher, ProductDiscount, InvoiceDiscount } from '../marketing/types'
import { errorMessage } from '../marketing/types'
import { SearchBox, StatusFilter } from '../components/ListSearch'
import { matches } from '../components/listSearchState'

type Phase = 'all' | 'running' | 'upcoming' | 'ended'

/** Giai đoạn của chương trình khuyến mãi theo thời gian hiện tại. */
function phaseOf(program: PromotionProgram, now = Date.now()): Exclude<Phase, 'all'> {
  if (new Date(program.startAt).getTime() > now) return 'upcoming'
  if (new Date(program.endAt).getTime() < now) return 'ended'
  return 'running'
}

async function fetchMarketingData(token: string) {
  const [programs, vouchers, productDiscounts, invoiceDiscounts] = await Promise.all([
    apiFetch<PromotionProgram[]>('/marketing/programs', {}, token),
    apiFetch<Voucher[]>('/marketing/vouchers', {}, token),
    apiFetch<ProductDiscount[]>('/marketing/product-discounts', {}, token),
    apiFetch<InvoiceDiscount[]>('/marketing/invoice-discounts', {}, token),
  ])
  return { programs, vouchers, productDiscounts, invoiceDiscounts }
}

export default function AdminMarketingPage() {
  const { token } = useAuth()
  const [programs, setPrograms] = useState<PromotionProgram[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>([])
  const [invoiceDiscounts, setInvoiceDiscounts] = useState<InvoiceDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<Phase>('all')

  // Lọc theo giai đoạn chương trình + từ khoá (mã / tên chương trình, mã voucher).
  const view = useMemo(() => {
    const inPhase = new Set(programs.filter((p) => phase === 'all' || phaseOf(p) === phase).map((p) => p.id))
    const programHit = new Set(programs.filter((p) => inPhase.has(p.id) && matches(query, p.code, p.name)).map((p) => p.id))
    const counts: Partial<Record<Phase, number>> = { all: programs.length, running: 0, upcoming: 0, ended: 0 }
    for (const p of programs) counts[phaseOf(p)] = (counts[phaseOf(p)] ?? 0) + 1
    return {
      counts,
      programs: programs.filter((p) => programHit.has(p.id)),
      vouchers: vouchers.filter((v) => inPhase.has(v.promotionProgramId) && (programHit.has(v.promotionProgramId) || matches(query, v.code))),
      productDiscounts: productDiscounts.filter((d) => programHit.has(d.promotionProgramId)),
      invoiceDiscounts: invoiceDiscounts.filter((d) => programHit.has(d.promotionProgramId)),
    }
  }, [programs, vouchers, productDiscounts, invoiceDiscounts, query, phase])

  const refresh = useCallback(async () => {
    if (!token) return
    const data = await fetchMarketingData(token)
    setPrograms(data.programs)
    setVouchers(data.vouchers)
    setProductDiscounts(data.productDiscounts)
    setInvoiceDiscounts(data.invoiceDiscounts)
    setError(null)
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true
    fetchMarketingData(token)
      .then((data) => {
        if (!active) return
        setPrograms(data.programs)
        setVouchers(data.vouchers)
        setProductDiscounts(data.productDiscounts)
        setInvoiceDiscounts(data.invoiceDiscounts)
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause, 'Không tải được dữ liệu marketing'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-space-md mb-space-md">
        <h1 className="!mb-0">Marketing</h1>
        <SearchBox page="marketing" placeholder="Tìm mã / tên chương trình, mã voucher..." value={query} onChange={setQuery} />
      </div>
      <StatusFilter options={[['all', 'Tất cả'], ['running', 'Đang chạy'], ['upcoming', 'Sắp diễn ra'], ['ended', 'Đã kết thúc']] as const} value={phase} onChange={setPhase} counts={view.counts} />
      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
      {!loading && !error && token && (
        <>
          <ProgramManager token={token} programs={view.programs} onChanged={refresh} />
          <VoucherManager token={token} programs={programs} vouchers={view.vouchers} onChanged={refresh} />
          <ProductDiscountManager token={token} programs={programs} discounts={view.productDiscounts} onChanged={refresh} />
          <InvoiceDiscountManager token={token} programs={programs} discounts={view.invoiceDiscounts} onChanged={refresh} />
        </>
      )}
    </div>
  )
}
