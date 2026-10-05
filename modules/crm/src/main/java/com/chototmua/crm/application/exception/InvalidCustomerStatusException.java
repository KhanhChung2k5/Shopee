package com.chototmua.crm.application.exception;

/**
 * Đổi trạng thái không hợp lệ (mở khóa khi đã xóa, khóa khách đã xóa, ...).
 * Không có nhánh khôi phục — đó là lỗi nghiệp vụ, không phải thiếu API.
 */
public class InvalidCustomerStatusException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Trạng thái PATCH không thuộc active / locked / deleted hoặc chuyển không hợp lệ. */
    public InvalidCustomerStatusException(String message) {
        super(message);
    }
}
