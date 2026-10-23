package com.chototmua.crm.port.dto;

/**
 * Phòng ban nhân viên dùng phân quyền CRM.
 * Chỉ 4 bộ phận theo thiết kế HTTTDN; phân hệ CRM do {@code cs} (Phòng CSKH) phụ trách,
 * phân khúc / chiến dịch do {@code sales}. Không có bộ phận {@code crm} riêng.
 */
public final class StaffDepartment {

    public static final String ADMIN = "admin";
    public static final String CS = "cs";
    public static final String SALES = "sales";
    public static final String WAREHOUSE = "warehouse";

    private StaffDepartment() {
        // Chỉ chứa hằng số nghiệp vụ, không tạo đối tượng.
    }
}
