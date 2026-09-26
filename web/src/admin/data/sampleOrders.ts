// Mock data for Order (domain C) — status field mirrors Order.status in
// the class diagram (pending|confirmed|shipping|delivered|cancelled).
export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'

export interface OrderRow {
  id: string
  customerName: string
  itemCount: number
  total: number
  status: OrderStatus
  createdAt: string
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}

export const INITIAL_ORDERS: OrderRow[] = [
  { id: 'DH-10231', customerName: 'Nguyễn Văn An', itemCount: 2, total: 1890000, status: 'delivered', createdAt: '2026-09-10' },
  { id: 'DH-10232', customerName: 'Trần Thị Bích', itemCount: 1, total: 450000, status: 'shipping', createdAt: '2026-09-12' },
  { id: 'DH-10233', customerName: 'Đặng Quốc Khánh', itemCount: 3, total: 3290000, status: 'confirmed', createdAt: '2026-09-14' },
  { id: 'DH-10234', customerName: 'Phạm Thu Hà', itemCount: 1, total: 890000, status: 'pending', createdAt: '2026-09-15' },
  { id: 'DH-10235', customerName: 'Bùi Thị Mai', itemCount: 2, total: 1290000, status: 'delivered', createdAt: '2026-09-08' },
  { id: 'DH-10236', customerName: 'Hoàng Đức Huy', itemCount: 1, total: 690000, status: 'cancelled', createdAt: '2026-09-11' },
  { id: 'DH-10237', customerName: 'Lê Minh Cường', itemCount: 4, total: 4590000, status: 'shipping', createdAt: '2026-09-16' },
]
