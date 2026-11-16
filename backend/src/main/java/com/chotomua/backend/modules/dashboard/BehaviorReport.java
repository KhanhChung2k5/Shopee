package com.chotomua.backend.modules.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Hành vi mua: giỏ nhiều nhóm và khoảng cách giữa các đơn đã giao. Không đo giỏ hàng hiện tại. */
public record BehaviorReport(
        LocalDate from,
        LocalDate to,
        long orders,
        long crossCategoryOrders,
        BigDecimal crossCategoryRatePct,
        long crossTypeOrders,
        BigDecimal crossTypeRatePct,
        long repeatPurchases,
        BigDecimal avgIntervalDays,
        BigDecimal medianIntervalDays,
        List<IntervalBucket> intervals
) {
    public record IntervalBucket(String key, String label, long count, List<RfmShare> segments) {}

    /** Một phân khúc RFM trong một khoảng chu kỳ. {@code percent} tính trên số lần của khoảng đó. */
    public record RfmShare(String segment, long count, BigDecimal percent) {}
}
