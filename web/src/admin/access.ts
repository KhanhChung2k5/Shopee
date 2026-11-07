export type Department = 'sales' | 'warehouse' | 'admin' | 'cs'

/**
 * Single source of truth for "which department sees which admin section".
 * Both the sidebar (AdminLayout) and the route guard (RequireDepartment on
 * each page) read from this same map — change access here once, both update
 * together. Never duplicate this list elsewhere.
 *
 * Phân tách nhiệm vụ (docs/phan-quyen-he-thong.md): mỗi nghiệp vụ thuộc một bộ phận; "admin" là
 * quản trị hệ thống — chỉ quản lý tài khoản nhân viên và xem nhật ký thao tác, không làm nghiệp vụ.
 * - san-pham   : bán hàng tạo/sửa sản phẩm; kho chỉ xem (biết biến thể khi nhập hàng)
 * - kho        : nhân viên kho quản lý tồn kho + duyệt phiếu nhập
 * - don-hang   : bán hàng xác nhận / thanh toán / hoá đơn, kho đóng gói / giao, CSKH chỉ xem để tra cứu
 * - hoan-tien  : CSKH duyệt yêu cầu trả hàng và chuyển khoản hoàn tiền
 * - marketing  : voucher/flash sale là quyết định kinh doanh của bán hàng
 * - khach-hang : quản lý khách hàng (thêm/khoá/xoá mềm/khôi phục) thuộc CRM, do CSKH phụ trách
 * - bao-cao-quan-tri : doanh thu/lợi nhuận (bán hàng), nhập–xuất–tồn (kho)
 * - bao-cao    : báo cáo khách hàng — CSKH
 * - nhan-vien, nhat-ky : chỉ admin — enforce ở backend (DEPT_ADMIN)
 */
export const ADMIN_SECTION_ACCESS: Record<string, Department[]> = {
  '/admin': ['sales', 'warehouse', 'admin', 'cs'],
  '/admin/san-pham': ['sales', 'warehouse'],
  '/admin/kho': ['warehouse'],
  '/admin/phieu-nhap': ['warehouse'],
  '/admin/don-hang': ['sales', 'warehouse', 'cs'],
  '/admin/hoan-tien': ['cs'],
  '/admin/marketing': ['sales'],
  '/admin/khach-hang': ['cs'],
  '/admin/bao-cao-quan-tri': ['sales', 'warehouse'],
  '/admin/bao-cao': ['cs'],
  '/admin/bao-cao/khao-sat': ['cs'],
  // Phân hệ CRM — docs/phan-quyen-he-thong.md mục 2.1
  '/admin/dieu-hanh': ['cs', 'sales'],
  '/admin/crm': ['cs'],
  '/admin/ho-tro': ['cs'],
  // Phản hồi đánh giá sản phẩm — khớp quyền PATCH /reviews/*/reply ở backend (chỉ CSKH)
  '/admin/danh-gia': ['cs'],
  '/admin/khao-sat': ['cs'],
  // Bán hàng tạo/sửa phân khúc; CSKH chỉ xem để chọn đối tượng gửi khảo sát
  '/admin/phan-khuc': ['sales', 'cs'],
  '/admin/chien-dich': ['sales'],
  '/admin/nhan-vien': ['admin'],
  // Nhật ký thao tác — API /api/crm/audit-logs chỉ cho DEPT_ADMIN
  '/admin/nhat-ky': ['admin'],
}

export function canAccessSection(path: string, department: Department | null): boolean {
  if (!department) return false
  const allowed = ADMIN_SECTION_ACCESS[path]
  return allowed ? allowed.includes(department) : false
}

/** Tabs of the management report page — matches /api/reports/* in SecurityConfig. */
export function canSeeRevenueReport(department: Department | null): boolean {
  return department === 'sales'
}

export function canSeeInventoryReport(department: Department | null): boolean {
  return department === 'warehouse'
}
