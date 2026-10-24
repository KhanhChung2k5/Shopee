import { typeLabel, type ProductType } from './catalog'
import { audienceLabel } from './loyalty'

export interface AvailableVoucher {
  id: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: number
  programName: string
  endsAt: string
  /** Program audience: null = every buyer, otherwise "this tier or higher". */
  minLoyaltyTier: string | null
  /** product_type values it discounts; empty = every product. */
  targetProductTypes: string[]
}

export interface VoucherQuote {
  voucherId: string
  code: string
  subtotal: number
  discountAmount: number
  payableAmount: number
  /** The part of the subtotal the voucher applies to (only its product types). */
  eligibleSubtotal: number
}

export function productScopeLabel(types: string[] | null | undefined) {
  return types?.length ? types.map((t) => typeLabel[t as ProductType] ?? t).join(', ') : 'Mọi sản phẩm'
}

/** "Áp dụng: Đĩa game · Hạng Vàng trở lên" */
export function voucherScopeLabel(voucher: Pick<AvailableVoucher, 'minLoyaltyTier' | 'targetProductTypes'>) {
  return `Áp dụng: ${productScopeLabel(voucher.targetProductTypes)} · ${audienceLabel(voucher.minLoyaltyTier)}`
}
