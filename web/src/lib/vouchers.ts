import { formatVnd, typeLabel, type ProductType } from './catalog'
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
  minOrderAmount: number | null
  maxDiscountAmount: number | null
  newCustomersOnly: boolean
  /** null = no total limit. */
  remainingUses: number | null
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

/** "Đơn từ 300.000 ₫ · Giảm tối đa 50.000 ₫ · Khách hàng mới · Còn 12 lượt" — empty when the voucher has no conditions. */
export function voucherConditionLabel(
  voucher: Pick<AvailableVoucher, 'minOrderAmount' | 'maxDiscountAmount' | 'newCustomersOnly' | 'remainingUses'>,
) {
  const parts: string[] = []
  if (voucher.minOrderAmount) parts.push(`Đơn từ ${formatVnd(voucher.minOrderAmount)}`)
  if (voucher.maxDiscountAmount) parts.push(`Giảm tối đa ${formatVnd(voucher.maxDiscountAmount)}`)
  if (voucher.newCustomersOnly) parts.push('Khách hàng mới')
  if (voucher.remainingUses != null) parts.push(`Còn ${voucher.remainingUses} lượt`)
  return parts.join(' · ')
}

/** "Áp dụng: Đĩa game · Hạng Vàng trở lên" */
export function voucherScopeLabel(voucher: Pick<AvailableVoucher, 'minLoyaltyTier' | 'targetProductTypes'>) {
  return `Áp dụng: ${productScopeLabel(voucher.targetProductTypes)} · ${audienceLabel(voucher.minLoyaltyTier)}`
}
