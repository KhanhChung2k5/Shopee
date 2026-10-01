import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../state/AuthContext'
import { apiFetch } from '../../lib/api'
import ProgramManager from '../marketing/ProgramManager'
import VoucherManager from '../marketing/VoucherManager'
import ProductDiscountManager from '../marketing/ProductDiscountManager'
import InvoiceDiscountManager from '../marketing/InvoiceDiscountManager'
import type { PromotionProgram, Voucher, ProductDiscount, InvoiceDiscount } from '../marketing/types'
import { errorMessage } from '../marketing/types'

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
      <h1>Marketing</h1>
      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
      {!loading && !error && token && (
        <>
          <ProgramManager token={token} programs={programs} onChanged={refresh} />
          <VoucherManager token={token} programs={programs} vouchers={vouchers} onChanged={refresh} />
          <ProductDiscountManager token={token} programs={programs} discounts={productDiscounts} onChanged={refresh} />
          <InvoiceDiscountManager token={token} programs={programs} discounts={invoiceDiscounts} onChanged={refresh} />
        </>
      )}
    </div>
  )
}
