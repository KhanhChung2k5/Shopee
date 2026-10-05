package com.chototmua.crm.application.exception;

/** Dữ liệu hội thoại không hợp lệ — lớp REST trả 422. */
public class InvalidConversationException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Lý do 422 (trạng thái, nội dung tin, CSAT, …). */
    public InvalidConversationException(String message) {
        super(message);
    }
}
