package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.ProductFilter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Một chiến dịch in-app vừa gửi hoặc đang liệt kê.
 * {@code sentCount} là thư còn trạng thái {@code sent}; {@code readCount} là thư {@code read}.
 * Tỷ lệ mở = read / (sent + read).
 */
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
        int readCount,
        List<SkippedRecipientResponse> skipped,
        String content,
        String deliveryStatus,
        List<UUID> productIds,
        ProductFilter filter
) {
}
