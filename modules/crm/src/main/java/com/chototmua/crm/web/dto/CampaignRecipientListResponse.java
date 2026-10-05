package com.chototmua.crm.web.dto;

import java.util.List;

/** Một trang người nhận. {@code total} là toàn bộ, không chỉ trang hiện tại. */
public record CampaignRecipientListResponse(int total, List<CampaignRecipientResponse> recipients) {
}
