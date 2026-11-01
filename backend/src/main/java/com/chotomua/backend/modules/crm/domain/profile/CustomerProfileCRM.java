package com.chotomua.backend.modules.crm.domain.profile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Hồ sơ CRM của một khách: LTV dự báo, tổng đã chi (tiền thực trả sau hoàn), số đơn đã giao, nhãn RFM.
 * Giữ trong bộ nhớ đến khi map cột {@code User.ltv} / {@code totalOrders} /
 * {@code lastPurchaseAt} / {@code rfmSegment} của nhóm. Không ghi điểm loyalty.
 */
public record CustomerProfileCRM(
        UUID userId,
        BigDecimal ltv,
        int totalOrders,
        String rfmSegment,
        Instant lastPurchaseAt,
        Instant calculatedAt,
        BigDecimal totalSpent
) {
    public CustomerProfileCRM {
        totalSpent = totalSpent == null ? BigDecimal.ZERO : totalSpent;
    }

    /** Hồ sơ chưa có tổng đã chi (bằng 0). */
    public CustomerProfileCRM(UUID userId, BigDecimal ltv, int totalOrders, String rfmSegment,
                              Instant lastPurchaseAt, Instant calculatedAt) {
        this(userId, ltv, totalOrders, rfmSegment, lastPurchaseAt, calculatedAt, BigDecimal.ZERO);
    }
}
