package com.chototmua.crm.domain.campaign;

import java.util.UUID;

/** Chiến dịch nhắm một phân khúc. Khóa kép {@code (campaign_id, segment_id)}. */
public record CampaignTarget(UUID campaignId, UUID segmentId) {
}
