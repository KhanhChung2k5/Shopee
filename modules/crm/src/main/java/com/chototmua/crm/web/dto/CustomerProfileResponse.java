package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Hồ sơ CRM đã tính từ đơn {@code delivered}.
 * {@code calculatedAt} rỗng khi chưa gọi tính lại.
 */
public record CustomerProfileResponse(
        UUID userId,
        String fullName,
        String status,
        BigDecimal ltv,
        int totalOrders,
        String rfmSegment,
        Instant lastPurchaseAt,
        Instant calculatedAt
) {
}
