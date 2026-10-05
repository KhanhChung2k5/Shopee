package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Một chiến dịch in-app vừa gửi hoặc đang liệt kê. */
public record CampaignResponse(
        UUID id,
        String name,
        String channel,
        Instant startAt,
        Instant endAt,
        List<UUID> segmentIds,
        String referenceType,
        UUID referenceId,
        int sentCount,
        List<SkippedRecipientResponse> skipped,
        String content,
        String deliveryStatus
) {
}
