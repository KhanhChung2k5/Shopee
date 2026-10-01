import { ApiError } from '../../lib/api'

export interface PromotionProgram {
  id: string
  code: string
  name: string
  programType: string
  targetLoyaltyTier: string | null
  startAt: string
  endAt: string
}

export interface Voucher {
  id: string
  promotionProgramId: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: number
  expiresAt: string | null
}

export const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 })
export const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export function toLocalInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback
}
