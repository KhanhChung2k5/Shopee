package com.chototmua.crm.application.exception;

/** Dữ liệu chiến dịch không dùng được — lớp REST trả 422. */
public class InvalidCampaignException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Lý do 422 (lịch, phân khúc, phiếu lưu trữ, …). */
    public InvalidCampaignException(String message) {
        super(message);
    }
}
