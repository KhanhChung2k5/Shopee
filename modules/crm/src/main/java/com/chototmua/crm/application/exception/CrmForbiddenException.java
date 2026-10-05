package com.chototmua.crm.application.exception;

/**
 * Người dùng đã đăng nhập nhưng sai phòng ban (ví dụ CSKH gọi câu chuyện 1–3).
 * Lớp REST trả 403; thông báo tiếng Việt để khớp hợp đồng lỗi.
 */
public class CrmForbiddenException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Thông báo tiếng Việt theo hợp đồng API (403). */
    public CrmForbiddenException(String message) {
        super(message);
    }
}
