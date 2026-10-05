package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Phân khúc không còn trong kho CRM — lớp REST trả 404. */
public class SegmentNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã phân khúc vào thông báo lỗi. */
    public SegmentNotFoundException(UUID segmentId) {
        super("Không tìm thấy phân khúc: " + segmentId);
    }
}
