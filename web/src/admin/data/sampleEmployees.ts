// Mock data for Employee (domain A) — department drives which admin
// sections a real logged-in employee would see once role-guards exist.
export type Department = 'sales' | 'warehouse' | 'admin' | 'cs'

export interface Employee {
  id: string
  fullName: string
  email: string
  department: Department
  position: string
  hiredAt: string
}

export const DEPARTMENT_LABEL: Record<Department, string> = {
  sales: 'Bán hàng',
  warehouse: 'Kho vận',
  admin: 'Quản trị',
  cs: 'Chăm sóc khách hàng',
}

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e-1', fullName: 'Ngô Thanh Tùng', email: 'tung.ngo@chotomua.vn', department: 'admin', position: 'Quản trị hệ thống', hiredAt: '2024-01-10' },
  { id: 'e-2', fullName: 'Lý Gia Bảo', email: 'bao.ly@chotomua.vn', department: 'sales', position: 'Nhân viên bán hàng', hiredAt: '2024-03-02' },
  { id: 'e-3', fullName: 'Trịnh Hồng Nhung', email: 'nhung.trinh@chotomua.vn', department: 'sales', position: 'Trưởng nhóm bán hàng', hiredAt: '2023-11-20' },
  { id: 'e-4', fullName: 'Phan Anh Dũng', email: 'dung.phan@chotomua.vn', department: 'warehouse', position: 'Thủ kho', hiredAt: '2024-02-14' },
  { id: 'e-5', fullName: 'Đỗ Khánh Vy', email: 'vy.do@chotomua.vn', department: 'cs', position: 'Chăm sóc khách hàng', hiredAt: '2024-05-06' },
  { id: 'e-6', fullName: 'Vũ Minh Quân', email: 'quan.vu@chotomua.vn', department: 'cs', position: 'Trưởng nhóm CSKH', hiredAt: '2023-09-01' },
]
