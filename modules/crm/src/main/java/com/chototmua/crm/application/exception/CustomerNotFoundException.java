package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Khách không tồn tại phía danh tính — lớp REST trả 404. */
public class CustomerNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã khách vào thông báo lỗi. */
    public CustomerNotFoundException(UUID customerId) {
        super("Không tìm thấy khách hàng: " + customerId);
    }
}
