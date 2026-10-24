/** Membership tiers — mirrors backend LoyaltyTier (ranked by lifetime points, 1 point per 10.000đ delivered). */
export const LOYALTY_TIERS = [
  { code: 'bronze', label: 'Đồng', minPoints: 0 },
  { code: 'silver', label: 'Bạc', minPoints: 500 },
  { code: 'gold', label: 'Vàng', minPoints: 2_000 },
  { code: 'diamond', label: 'Kim cương', minPoints: 5_000 },
] as const

export type LoyaltyTierCode = (typeof LOYALTY_TIERS)[number]['code']

/** A buyer not ranked yet counts as bronze. */
export function tierLabel(code: string | null | undefined) {
  return LOYALTY_TIERS.find((tier) => tier.code === code)?.label ?? 'Đồng'
}

/** Program audience: "Mọi khách hàng" or "Hạng Vàng trở lên". */
export function audienceLabel(minTier: string | null | undefined) {
  return minTier ? `Hạng ${tierLabel(minTier)} trở lên` : 'Mọi khách hàng'
}

export function nextTier(lifetimePoints: number) {
  return LOYALTY_TIERS.find((tier) => tier.minPoints > lifetimePoints) ?? null
}
