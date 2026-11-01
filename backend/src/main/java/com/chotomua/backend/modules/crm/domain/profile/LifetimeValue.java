package com.chotomua.backend.modules.crm.domain.profile;

import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * LTV (giá trị vòng đời) dự báo của một khách, tính từ các đơn đã giao (tiền thực trả, đã trừ hoàn tiền):
 * <pre>
 *   LTV = giá trị đơn trung bình × số đơn mỗi năm × vòng đời kỳ vọng
 *   giá trị đơn trung bình = tổng đã chi / số đơn
 *   số đơn mỗi năm        = số đơn / số năm đã gắn bó (từ đơn đầu tiên đến hôm nay, tối thiểu 1 năm)
 *   vòng đời kỳ vọng      = max(3 năm, số năm đã gắn bó)
 * </pre>
 * Nhờ vòng đời không ngắn hơn thời gian đã gắn bó, LTV dự báo không bao giờ nhỏ hơn số tiền khách đã chi,
 * và không về 0 khi sang năm mới. Tổng đã chi ({@code historicalSpend}) được giữ riêng để hiển thị và chấm RFM.
 */
public final class LifetimeValue {

    /** Một khách trung bình gắn bó với cửa hàng bao lâu (giả định nghiệp vụ). */
    public static final BigDecimal EXPECTED_LIFESPAN_YEARS = new BigDecimal("3");

    private static final int SCALE = 2;
    private static final BigDecimal DAYS_PER_YEAR = new BigDecimal("365");

    private LifetimeValue() {
    }

    public static BigDecimal of(List<DeliveredOrderView> delivered, Clock clock) {
        return snapshot(delivered, clock).ltv();
    }

    public static Snapshot snapshot(List<DeliveredOrderView> delivered, Clock clock) {
        List<DeliveredOrderView> orders = delivered == null ? List.of() : delivered;
        BigDecimal historicalSpend = BigDecimal.ZERO;
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
        }
        return new Snapshot(
                ltv(historicalSpend, orders.size(), firstPurchaseAt, Instant.now(clock)),
                historicalSpend.setScale(SCALE, RoundingMode.HALF_UP),
                lastPurchaseAt);
    }

    private static BigDecimal ltv(BigDecimal spend, int orderCount, Instant firstPurchaseAt, Instant now) {
        if (orderCount <= 0 || spend.signum() <= 0) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal averageOrderValue = spend.divide(BigDecimal.valueOf(orderCount), 8, RoundingMode.HALF_UP);
        BigDecimal tenureYears = tenureYears(firstPurchaseAt, now);
        BigDecimal ordersPerYear = BigDecimal.valueOf(orderCount).divide(tenureYears, 8, RoundingMode.HALF_UP);
        BigDecimal lifespanYears = EXPECTED_LIFESPAN_YEARS.max(tenureYears);
        // Vietnamese đồng has no minor unit: the forecast is rounded to whole đồng.
        return averageOrderValue.multiply(ordersPerYear).multiply(lifespanYears).setScale(0, RoundingMode.HALF_UP)
                .setScale(SCALE, RoundingMode.HALF_UP);
    }

    /** Số năm từ đơn đầu tiên đến hôm nay, tối thiểu 1 năm (khách mới không bị thổi phồng tần suất). */
    private static BigDecimal tenureYears(Instant firstPurchaseAt, Instant now) {
        if (firstPurchaseAt == null || !now.isAfter(firstPurchaseAt)) {
            return BigDecimal.ONE;
        }
        BigDecimal years = BigDecimal.valueOf(ChronoUnit.DAYS.between(firstPurchaseAt, now))
                .divide(DAYS_PER_YEAR, 8, RoundingMode.HALF_UP);
        return years.max(BigDecimal.ONE);
    }

    /** {@code ltv}: LTV dự báo; {@code historicalSpend}: tổng đã chi (dùng chấm RFM Monetary). */
    public record Snapshot(BigDecimal ltv, BigDecimal historicalSpend, Instant lastPurchaseAt) {
    }
}
