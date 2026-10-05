package com.chototmua.crm.port.dto;

/**
 * Phòng ban nhân viên dùng phân quyền CRM.
 * {@code crm} (quản lý CRM) do đặc tả chốt — sơ đồ lớp bản 9 chưa liệt kê, bản giả lập dùng ngay.
 */
public final class StaffDepartment {

    public static final String ADMIN = "admin";
    public static final String CRM = "crm";
    public static final String CS = "cs";
    public static final String SALES = "sales";
    public static final String WAREHOUSE = "warehouse";

    private StaffDepartment() {
        // Chỉ chứa hằng số nghiệp vụ, không tạo đối tượng.
    }
}
