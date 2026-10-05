package com.chototmua.crm.domain.profile;

import com.chototmua.crm.port.dto.DeliveredOrderView;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * LTV từng khách: (AOV năm lịch × tần suất mua năm lịch) × số năm từ lần giao đầu đến lần giao cuối.
 * Tần suất = số đơn năm lịch vì mẫu số unique customer = 1. Chưa có đơn trong năm lịch thì 0.
 * Một mốc giao (hoặc cùng Instant) thì lifespan = 1 năm, tránh nhân 0.
 */
public final class LifetimeValue {

    private static final int SCALE = 2;
    private static final BigDecimal DAYS_PER_YEAR = new BigDecimal("365");

    private LifetimeValue() {
    }

    public static BigDecimal of(List<DeliveredOrderView> delivered, Clock clock) {
        return snapshot(delivered, clock).ltv();
    }

    public static Snapshot snapshot(List<DeliveredOrderView> delivered, Clock clock) {
        List<DeliveredOrderView> orders = delivered == null ? List.of() : delivered;
        ZoneId zone = clock.getZone();
        int calendarYear = LocalDate.now(clock).getYear();
        BigDecimal historicalSpend = BigDecimal.ZERO;
        BigDecimal annualRevenue = BigDecimal.ZERO;
        int annualOrders = 0;
        Instant firstPurchaseAt = null;
        Instant lastPurchaseAt = null;
        for (DeliveredOrderView order : orders) {
            if (order.totalAmount() != null) {
                historicalSpend = historicalSpend.add(order.totalAmount());
            }
            Instant deliveredAt = order.deliveredAt();
            if (deliveredAt == null) {
                continue;
            }
            if (firstPurchaseAt == null || deliveredAt.isBefore(firstPurchaseAt)) {
                firstPurchaseAt = deliveredAt;
            }
            if (lastPurchaseAt == null || deliveredAt.isAfter(lastPurchaseAt)) {
                lastPurchaseAt = deliveredAt;
            }
            if (LocalDate.ofInstant(deliveredAt, zone).getYear() == calendarYear) {
                annualOrders++;
                if (order.totalAmount() != null) {
                    annualRevenue = annualRevenue.add(order.totalAmount());
                }
            }
        }
        return new Snapshot(
                ltv(annualRevenue, annualOrders, firstPurchaseAt, lastPurchaseAt),
                historicalSpend,
                lastPurchaseAt);
    }

    private static BigDecimal ltv(
            BigDecimal annualRevenue,
            int annualOrders,
            Instant firstPurchaseAt,
            Instant lastPurchaseAt) {
        if (annualOrders <= 0) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal averageOrderValue = annualRevenue.divide(
                BigDecimal.valueOf(annualOrders), 8, RoundingMode.HALF_UP);
        BigDecimal purchaseFrequency = BigDecimal.valueOf(annualOrders);
        BigDecimal customerValue = averageOrderValue.multiply(purchaseFrequency);
        return customerValue.multiply(lifespanYears(firstPurchaseAt, lastPurchaseAt))
                .setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal lifespanYears(Instant firstPurchaseAt, Instant lastPurchaseAt) {
        if (firstPurchaseAt == null || lastPurchaseAt == null || !lastPurchaseAt.isAfter(firstPurchaseAt)) {
            return BigDecimal.ONE;
        }
        long days = ChronoUnit.DAYS.between(firstPurchaseAt, lastPurchaseAt);
        if (days <= 0) {
            return BigDecimal.ONE;
        }
        return BigDecimal.valueOf(days).divide(DAYS_PER_YEAR, 8, RoundingMode.HALF_UP);
    }

    /** LTV công thức infographic; {@code historicalSpend} dùng chấm RFM Monetary. */
    public record Snapshot(BigDecimal ltv, BigDecimal historicalSpend, Instant lastPurchaseAt) {
    }
}
