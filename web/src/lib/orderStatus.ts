export type OrderStatus = 'pending' | 'confirmed' | 'cancel_requested' | 'shipping' | 'delivered' | 'cancelled'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancel_requested: 'Chờ xác nhận huỷ',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}

/** Badge tone per status (see Badge in components/ui). */
export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'info' | 'danger'> = {
  pending: 'primary',
  confirmed: 'info',
  cancel_requested: 'danger',
  shipping: 'info',
  delivered: 'success',
  cancelled: 'neutral',
}

export const SHIPMENT_LABEL: Record<string, string> = {
  pending: 'Chờ đóng gói',
  packed: 'Đã đóng gói',
  shipping: 'Đang vận chuyển',
  delivered: 'Đã giao hàng',
  failed: 'Giao không thành công',
}

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatOrderDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase()
}
