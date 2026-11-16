package com.chototmua.crm.port.dto;

/**
 * Trạng thái tài khoản khách theo tổng quan hệ thống mục 6.
 * {@code deleted} ẩn khỏi danh sách mặc định; chỉ quản trị viên được khôi phục về {@code active}.
 */
public final class CustomerStatus {

    public static final String ACTIVE = "active";
    public static final String LOCKED = "locked";
    public static final String DELETED = "deleted";

    private CustomerStatus() {
        // Chỉ chứa hằng số nghiệp vụ, không tạo đối tượng.
    }
}
