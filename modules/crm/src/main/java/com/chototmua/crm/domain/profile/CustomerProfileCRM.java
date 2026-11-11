package com.chototmua.crm.domain.profile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Hồ sơ CRM của một khách: giá trị đời (ltv), số đơn đã giao, nhãn RFM.
 * Giữ trong bộ nhớ đến khi map cột {@code User.ltv} / {@code totalOrders} /
 * {@code lastPurchaseAt} / {@code rfmSegment} của nhóm. Không ghi điểm loyalty.
 */
public record CustomerProfileCRM(
        UUID userId,
        BigDecimal ltv,
        int totalOrders,
        String rfmSegment,
        Instant lastPurchaseAt,
        Instant calculatedAt
) {
}
