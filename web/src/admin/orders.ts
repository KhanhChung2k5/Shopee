import type { Refund } from '../lib/refunds'

/** Staff order board — shapes returned by GET /orders and GET /orders/{id} for sales / warehouse / admin. */
export type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'
export type ShipmentStatus = 'pending' | 'packed' | 'shipping' | 'delivered'

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
}

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

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Chưa đóng gói',
  packed: 'Đã đóng gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
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
