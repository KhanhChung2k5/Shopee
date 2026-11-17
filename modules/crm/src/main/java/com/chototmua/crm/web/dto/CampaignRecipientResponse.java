package com.chototmua.crm.web.dto;

import java.util.UUID;

/** Một khách nhận thông báo của chiến dịch. */
public record CampaignRecipientResponse(UUID userId, String fullName, String status) {
}
