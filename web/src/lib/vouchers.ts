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
  /** Specific products it is limited to (besides the product types). */
  targetProductNames: string[]
  /** Uses left for this buyer; null = no per-buyer limit. */
  remainingForYou: number | null
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

/** "Đĩa game, Đĩa PS5 Astro Bot" — the product types and the specific products a voucher covers. */
export function productScopeLabel(types: string[] | null | undefined, productNames: string[] = []) {
  const parts = [...(types ?? []).map((t) => typeLabel[t as ProductType] ?? t), ...productNames]
  return parts.length ? parts.join(', ') : 'Mọi sản phẩm'
}

/** "Đơn từ 300.000 ₫ · Giảm tối đa 50.000 ₫ · Khách hàng mới · Còn 12 lượt" — empty when the voucher has no conditions. */
export function voucherConditionLabel(
  voucher: Pick<AvailableVoucher, 'minOrderAmount' | 'maxDiscountAmount' | 'newCustomersOnly' | 'remainingUses'>
    & Partial<Pick<AvailableVoucher, 'remainingForYou'>>,
) {
  const parts: string[] = []
  if (voucher.minOrderAmount) parts.push(`Đơn từ ${formatVnd(voucher.minOrderAmount)}`)
  if (voucher.maxDiscountAmount) parts.push(`Giảm tối đa ${formatVnd(voucher.maxDiscountAmount)}`)
  if (voucher.newCustomersOnly) parts.push('Khách hàng mới')
  if (voucher.remainingUses != null) parts.push(`Còn ${voucher.remainingUses} lượt`)
  if (voucher.remainingForYou === null) parts.push('Dùng nhiều lần')
  else if (voucher.remainingForYou != null && voucher.remainingForYou > 1) parts.push(`Bạn còn ${voucher.remainingForYou} lượt`)
  return parts.join(' · ')
}

/** "Áp dụng: Đĩa game · Hạng Vàng trở lên" */
export function voucherScopeLabel(voucher: Pick<AvailableVoucher, 'minLoyaltyTier' | 'targetProductTypes'>
  & Partial<Pick<AvailableVoucher, 'targetProductNames'>>) {
  return `Áp dụng: ${productScopeLabel(voucher.targetProductTypes, voucher.targetProductNames)} · ${audienceLabel(voucher.minLoyaltyTier)}`
}
