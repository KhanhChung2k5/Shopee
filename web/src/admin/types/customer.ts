// Real shape returned by GET /customers (backend/.../dto/CustomerResponse.java).
// totalOrders/ltv are honestly 0 for every account today — nothing writes to
// them yet because the Order module (Phase 2+) hasn't been built.
export type CustomerStatus = 'active' | 'locked' | 'deleted'

export interface Customer {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  gender: string | null
  dob: string | null // ISO date, may be absent until the buyer fills their profile
  status: CustomerStatus
  totalOrders: number
  ltv: number
}

export function age(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}
