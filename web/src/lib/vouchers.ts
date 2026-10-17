export interface AvailableVoucher {
  id: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: number
  programName: string
  endsAt: string
}

export interface VoucherQuote {
  voucherId: string
  code: string
  subtotal: number
  discountAmount: number
  payableAmount: number
}
