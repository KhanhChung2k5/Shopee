/** Refunds are sent back by hand to the buyer's bank account — shapes of /refund-returns and order.refunds. */
export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'refunded'
export type RefundKind = 'return' | 'cancellation'

export interface Refund {
  id: string
  orderId: string
  orderItemId: string | null
  kind: RefundKind
  productName: string | null
  quantity: number | null
  reason: string | null
  status: RefundStatus
  refundAmount: number | null
  bankName: string | null
  bankAccountNo: string | null
  bankAccountName: string | null
  staffNote: string | null
  transferRef: string | null
  requestedAt: string
  handledAt: string | null
  refundedAt: string | null
  customerName: string | null
  customerEmail: string | null
}

export interface BankAccount {
  bankName: string
  bankAccountNo: string
  bankAccountName: string
}

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt – chờ chuyển tiền',
  rejected: 'Bị từ chối',
  refunded: 'Đã hoàn tiền',
}

export const REFUND_STATUS_TONE: Record<RefundStatus, 'info' | 'primary' | 'danger' | 'success'> = {
  requested: 'info',
  approved: 'primary',
  rejected: 'danger',
  refunded: 'success',
}

export const REFUND_KIND_LABEL: Record<RefundKind, string> = {
  return: 'Trả hàng',
  cancellation: 'Huỷ đơn đã thanh toán',
}

/** Days after delivery a line can still be sent back — same as RefundService.RETURN_WINDOW. */
export const RETURN_WINDOW_DAYS = 7

export const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'TPBank',
  'HDBank', 'VIB', 'SHB', 'OCB', 'SeABank', 'MSB', 'Eximbank', 'LPBank', 'Nam A Bank', 'Cake by VPBank', 'Timo',
]

export const maskAccount = (accountNo: string | null) =>
  !accountNo ? '—' : accountNo.length <= 4 ? accountNo : `${'•'.repeat(Math.min(6, accountNo.length - 4))}${accountNo.slice(-4)}`
