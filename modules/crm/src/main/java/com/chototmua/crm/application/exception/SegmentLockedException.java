package com.chototmua.crm.application.exception;

/** Phân khúc mặc định theo nhãn RFM không được sửa hoặc xóa. REST trả 409. */
public class SegmentLockedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Thông báo 409 khi đụng phân khúc RFM hệ thống. */
    public SegmentLockedException(String message) {
        super(message);
    }
}
