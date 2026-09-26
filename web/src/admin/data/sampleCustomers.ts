// Mock CRM customer data — mirrors User fields relevant to admin account
// management (fullName, dob, gender, status) per class diagram v8 (User
// merged with UserProfile). favoriteCategory stands in for the real
// aggregate ("purchase history → category") until Order data exists.
export type CustomerStatus = 'active' | 'locked' | 'deleted'

export interface Customer {
  id: string
  fullName: string
  email: string
  phone: string
  gender: 'Nam' | 'Nữ' | 'Khác'
  dob: string // ISO date
  status: CustomerStatus
  favoriteCategory: string
  totalOrders: number
  ltv: number
}

function age(dob: string): number {
  const d = new Date(dob)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export { age }

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c-1', fullName: 'Nguyễn Văn An', email: 'an.nguyen@example.com', phone: '0901111222', gender: 'Nam', dob: '1998-03-12', status: 'active', favoriteCategory: 'Tay cầm PS5', totalOrders: 12, ltv: 18500000 },
  { id: 'c-2', fullName: 'Trần Thị Bích', email: 'bich.tran@example.com', phone: '0902222333', gender: 'Nữ', dob: '2003-07-25', status: 'active', favoriteCategory: 'Đĩa game Switch', totalOrders: 5, ltv: 3200000 },
  { id: 'c-3', fullName: 'Lê Minh Cường', email: 'cuong.le@example.com', phone: '0903333444', gender: 'Nam', dob: '1995-11-02', status: 'locked', favoriteCategory: 'Tay cầm Xbox', totalOrders: 2, ltv: 1590000 },
  { id: 'c-4', fullName: 'Phạm Thu Hà', email: 'ha.pham@example.com', phone: '0904444555', gender: 'Nữ', dob: '2000-01-18', status: 'active', favoriteCategory: 'Tai nghe gaming', totalOrders: 8, ltv: 6400000 },
  { id: 'c-5', fullName: 'Hoàng Đức Huy', email: 'huy.hoang@example.com', phone: '0905555666', gender: 'Nam', dob: '2006-09-09', status: 'active', favoriteCategory: 'Đĩa game PS5', totalOrders: 3, ltv: 2100000 },
  { id: 'c-6', fullName: 'Vũ Ngọc Lan', email: 'lan.vu@example.com', phone: '0906666777', gender: 'Nữ', dob: '1990-05-30', status: 'deleted', favoriteCategory: 'Phụ kiện tay cầm', totalOrders: 1, ltv: 450000 },
  { id: 'c-7', fullName: 'Đặng Quốc Khánh', email: 'khanh.dang@example.com', phone: '0907777888', gender: 'Nam', dob: '2001-12-05', status: 'active', favoriteCategory: 'Tay cầm PS5', totalOrders: 15, ltv: 24500000 },
  { id: 'c-8', fullName: 'Bùi Thị Mai', email: 'mai.bui@example.com', phone: '0908888999', gender: 'Nữ', dob: '1997-04-14', status: 'active', favoriteCategory: 'Đĩa game Xbox', totalOrders: 6, ltv: 5100000 },
]
