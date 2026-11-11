package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Hội thoại không có hoặc người xem không được biết nó tồn tại. */
public class ConversationNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã hội thoại vào thông báo lỗi. */
    public ConversationNotFoundException(UUID conversationId) {
        super("Không tìm thấy hội thoại: " + conversationId);
    }
}
