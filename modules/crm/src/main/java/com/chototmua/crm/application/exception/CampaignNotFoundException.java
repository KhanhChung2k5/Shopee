package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Chiến dịch không còn trong kho CRM — lớp REST trả 404. */
public class CampaignNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã chiến dịch vào thông báo lỗi. */
    public CampaignNotFoundException(UUID campaignId) {
        super("Không tìm thấy chiến dịch: " + campaignId);
    }
}
