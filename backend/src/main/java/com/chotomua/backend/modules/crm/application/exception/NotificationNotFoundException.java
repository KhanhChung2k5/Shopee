package com.chotomua.backend.modules.crm.application.exception;

import java.util.UUID;

/** Thư hộp thư không còn — lớp REST trả 404. */
public class NotificationNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã thư vào thông báo lỗi. */
    public NotificationNotFoundException(UUID notificationId) {
        super("Không tìm thấy thư: " + notificationId);
    }
}
