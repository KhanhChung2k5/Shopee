import type { Refund } from '../lib/refunds'

/** Staff order board — shapes returned by GET /orders and GET /orders/{id} for sales / warehouse / admin. */
export type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'
export type ShipmentStatus = 'pending' | 'packed' | 'shipping' | 'delivered' | 'failed'

export interface OrderCustomer {
  userId: string
  fullName: string | null
  email: string | null
  phone: string | null
  recipientName: string | null
  recipientPhone: string | null
}

export interface StaffOrderSummary {
  id: string
  totalAmount: number
  status: OrderStatus
  shipmentStatus: ShipmentStatus
  itemCount: number
  createdAt: string
  customer: OrderCustomer | null
  paymentMethod: 'cod' | 'bank_transfer' | null
  paymentStatus: string | null
  refundedAmount: number
}

/** Short payment label for order lists: "COD · Chưa thu tiền", "CK · Đã thanh toán"… */
export const paymentShort = (o: { paymentMethod: string | null; paymentStatus: string | null }) =>
  !o.paymentMethod ? '—' : `${o.paymentMethod === 'cod' ? 'COD' : 'CK'} · ${PAYMENT_STATUS_LABEL[o.paymentStatus ?? ''] ?? o.paymentStatus ?? ''}`

/** Bank-transfer orders whose money sales still has to check against the bank statement. */
export const awaitsTransfer = (o: { status: OrderStatus; paymentMethod: string | null; paymentStatus: string | null }) =>
  o.paymentMethod === 'bank_transfer' && o.paymentStatus === 'pending' && o.status !== 'cancelled'

export interface StaffOrderItem {
  id: string
  variantId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productNameSnapshot: string
  variantAttributesSnapshot: string | null
  imageUrl: string | null
}

export interface StaffOrderHistory {
  id: string
  status: string
  changedBy: string
  changedByType: string
  reason: string | null
  changedAt: string
}

export interface OrderPayment {
  method: 'cod' | 'bank_transfer' | string
  status: 'pending' | 'paid' | 'cancelled' | 'partially_refunded' | 'refunded' | string
  amount: number
  paidAt: string | null
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chưa thu tiền',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
  partially_refunded: 'Đã hoàn một phần',
  refunded: 'Đã hoàn tiền',
}

export interface StaffOrderDetail {
  id: string
  shippingAddressSnapshot: string
  subtotalAmount: number
  discountAmount: number
  shippingFeeAmount: number
  totalAmount: number
  status: OrderStatus
  warehouseId: string | null
  shippingProviderName: string | null
  trackingNo: string | null
  shipmentStatus: ShipmentStatus
  createdAt: string
  items: StaffOrderItem[]
  statusHistory: StaffOrderHistory[]
  customer: OrderCustomer | null
  payment: OrderPayment | null
  refunds: Refund[]
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancel_requested: 'Khách yêu cầu huỷ',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}

/**
 * An order still in this status this many days after it was placed needs a person to look at it: a pending order
 * holds stock, a cancel request keeps the buyer waiting, a parcel on the road for days may be lost.
 */
export const STALE_AFTER_DAYS: Partial<Record<OrderStatus, number>> = {
  pending: 2,
  cancel_requested: 2,
  confirmed: 3,
  shipping: 5,
}

const DAY_MS = 86_400_000

/** Whole days since the order was placed. */
export const orderAgeDays = (o: { createdAt: string }, now = Date.now()) =>
  Math.floor((now - new Date(o.createdAt).getTime()) / DAY_MS)

export const isStaleOrder = (o: { status: OrderStatus; createdAt: string }, now = Date.now()) => {
  const limit = STALE_AFTER_DAYS[o.status]
  return limit != null && orderAgeDays(o, now) >= limit
}

/** Stale orders per status, oldest first within the dashboard warning. */
export function staleOrderGroups(orders: StaffOrderSummary[], now = Date.now()) {
  return (Object.keys(STALE_AFTER_DAYS) as OrderStatus[])
    .map((status) => {
      const stale = orders.filter((o) => o.status === status && isStaleOrder(o, now))
      return {
        status,
        limitDays: STALE_AFTER_DAYS[status]!,
        count: stale.length,
        oldestDays: stale.reduce((max, o) => Math.max(max, orderAgeDays(o, now)), 0),
      }
    })
    .filter((group) => group.count > 0)
}

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Chưa đóng gói',
  packed: 'Đã đóng gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  failed: 'Giao thất bại',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, 'active' | 'locked' | 'deleted' | 'info'> = {
  pending: 'locked',
  confirmed: 'info',
  cancel_requested: 'deleted',
  shipping: 'info',
  delivered: 'active',
  cancelled: 'deleted',
}

/** Same short code the buyer sees on their order page. */
export const orderCode = (id: string) => `#${id.slice(0, 8).toUpperCase()}`
