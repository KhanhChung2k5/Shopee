package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Tóm tắt một đơn đã giao để chọn khi thử hook demo. */
public record DeliveredOrderSummary(
        UUID orderId,
        UUID userId,
        BigDecimal totalAmount,
        Instant deliveredAt,
        List<UUID> productIds
) {
}
