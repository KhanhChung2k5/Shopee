export type Department = 'sales' | 'warehouse' | 'admin' | 'cs'

/**
 * Single source of truth for "which department sees which admin section".
 * Both the sidebar (AdminLayout) and the route guard (RequireDepartment on
 * each page) read from this same map — change access here once, both update
 * together. Never duplicate this list elsewhere.
 *
 * Mapping rationale (matches task descriptions already agreed for Phase 2-5):
 * - san-pham   : nhân viên bán hàng tạo/sửa sản phẩm (CRUD Product)
 * - kho        : nhân viên kho quản lý tồn kho + duyệt phiếu nhập (CRUD Warehouse/GoodsReceipt)
 * - don-hang   : cả sales (xử lý/xuất hoá đơn) lẫn warehouse (đóng gói/xuất kho) đều thao tác trên Order
 * - marketing  : voucher/flash sale là quyết định kinh doanh của sales
 * - khach-hang : quản lý khách hàng (thêm/khoá/xoá mềm) thuộc CRM, do CS phụ trách
 * - bao-cao    : báo cáo demographic là dữ liệu tổng hợp cấp quản trị
 * - nhan-vien  : chỉ admin — đã enforce ở backend (DEPT_ADMIN)
 *
 * "admin" luôn có mặt ở mọi mục — quản trị hệ thống có quyền cao nhất, xem được tất cả.
 */
export const ADMIN_SECTION_ACCESS: Record<string, Department[]> = {
  '/admin': ['sales', 'warehouse', 'admin', 'cs'],
  '/admin/san-pham': ['sales', 'admin'],
  '/admin/kho': ['warehouse', 'admin'],
  '/admin/phieu-nhap': ['warehouse', 'admin'],
  '/admin/don-hang': ['sales', 'warehouse', 'admin'],
  '/admin/marketing': ['sales', 'admin'],
  '/admin/khach-hang': ['cs', 'admin'],
  '/admin/bao-cao': ['admin'],
  '/admin/nhan-vien': ['admin'],
}

export function canAccessSection(path: string, department: Department | null): boolean {
  if (!department) return false
  const allowed = ADMIN_SECTION_ACCESS[path]
  return allowed ? allowed.includes(department) : false
}
