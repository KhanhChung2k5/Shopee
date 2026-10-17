// Mock data for Order (domain C) — status field mirrors Order.status in the
// class diagram (pending|confirmed|shipping|delivered|cancelled). This is
// illustrative-only: the Order module (Phase 3) hasn't been built yet, so
// there is no real orders/order_items table to read from. Totals are computed
// from real catalog prices (web/src/data/sampleProducts.ts) so the numbers
// stay plausible; customer names are fictional placeholders, not tied to any
// real account — do not treat these as real user data.
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
  { id: 'DH-10231', customerName: 'Ngô Thanh Tùng', itemCount: 1, total: 1799000, status: 'delivered', createdAt: '2026-09-02' }, // Stellar Blade
  { id: 'DH-10232', customerName: 'Vũ Thị Hạnh', itemCount: 2, total: 3898000, status: 'delivered', createdAt: '2026-09-03' }, // DualSense Chroma Indigo + Ốp bọc Cobalt Blue
  { id: 'DH-10233', customerName: 'Đỗ Minh Quang', itemCount: 2, total: 2498000, status: 'cancelled', createdAt: '2026-09-04' }, // Horizon Zero Dawn Remastered x2
  { id: 'DH-10234', customerName: 'Lý Gia Bảo', itemCount: 1, total: 5699000, status: 'delivered', createdAt: '2026-09-05' }, // DualSense Edge
  { id: 'DH-10235', customerName: 'Trịnh Khánh Linh', itemCount: 2, total: 3298000, status: 'shipping', createdAt: '2026-09-08' }, // God of War Ragnarök + Until Dawn
  { id: 'DH-10236', customerName: 'Phan Đức Thắng', itemCount: 1, total: 799000, status: 'delivered', createdAt: '2026-09-09' }, // Đế sạc DualSense
  { id: 'DH-10237', customerName: 'Mai Thu Trang', itemCount: 1, total: 1499000, status: 'confirmed', createdAt: '2026-09-10' }, // LEGO Horizon Adventure
  { id: 'DH-10238', customerName: 'Hồ Nhật Nam', itemCount: 2, total: 3198000, status: 'delivered', createdAt: '2026-09-11' }, // Camera cảm biến + Ốp bọc Volcanic Red
  { id: 'DH-10239', customerName: 'Chu Bảo Ngọc', itemCount: 1, total: 1799000, status: 'shipping', createdAt: '2026-09-13' }, // Gran Turismo 7
  { id: 'DH-10240', customerName: 'Dương Anh Tuấn', itemCount: 3, total: 5097000, status: 'delivered', createdAt: '2026-09-14' }, // Rise of the Ronin + Astro Bot + Nioh Collection
  { id: 'DH-10241', customerName: 'Tạ Thị Yến', itemCount: 1, total: 2099000, status: 'pending', createdAt: '2026-09-16' }, // DualSense Nova Pink
  { id: 'DH-10242', customerName: 'Lưu Hoàng Phúc', itemCount: 1, total: 2599000, status: 'confirmed', createdAt: '2026-09-17' }, // Access Controller
  { id: 'DH-10243', customerName: 'Bạch Diệu My', itemCount: 2, total: 3048000, status: 'delivered', createdAt: '2026-09-18' }, // Ratchet & Clank + Death Stranding
  { id: 'DH-10244', customerName: 'Vương Chí Dũng', itemCount: 1, total: 12299000, status: 'pending', createdAt: '2026-09-19' }, // Final Fantasy XVI STD
  { id: 'DH-10245', customerName: 'Đinh Phương Thảo', itemCount: 1, total: 2299000, status: 'cancelled', createdAt: '2026-09-20' }, // DualSense Volcanic Red
  { id: 'DH-10246', customerName: 'Cao Minh Hiếu', itemCount: 2, total: 2748000, status: 'shipping', createdAt: '2026-09-21' }, // The Last of Us Part II Remastered + Forspoken
]
