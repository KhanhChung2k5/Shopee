package com.chotomua.backend.modules.crm.domain.profile;

import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LifetimeValueTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-23T08:00:00Z"), ZoneOffset.UTC);

    @Test
    void noOrdersAreZero() {
        assertThat(LifetimeValue.of(List.of(), CLOCK)).isEqualByComparingTo("0.00");
    }

    /** LTV = average order value × orders per year × expected lifespan (2 years, or longer if already loyal longer). */
    @Test
    void oneRecentOrderProjectsOverTheTwoYearLifespan() {
        List<DeliveredOrderView> delivered = List.of(order("80000", "2026-07-01T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("160000.00");
    }

    @Test
    void customersWithUnderAYearCountAsOneYearOfPurchases() {
        List<DeliveredOrderView> delivered = List.of(
                order("150000", "2026-08-01T10:00:00Z"),
                order("100000", "2026-08-20T10:00:00Z"));

        // AOV 125,000 × 2 orders/year × 2 years
        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("500000.00");
    }

    @Test
    void lastYearsOrdersStillCountAfterNewYear() {
        List<DeliveredOrderView> delivered = List.of(order("900000", "2025-12-31T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("1800000.00");
    }

    @Test
    void purchaseRateIsSpreadOverTheYearsSinceTheFirstOrder() {
        List<DeliveredOrderView> delivered = List.of(
                order("100000", "2025-08-01T10:00:00Z"),
                order("200000", "2026-08-01T10:00:00Z"));

        // 417 days since the first order = 1.14246575 years: 150,000 × (2 / 1.14246575) × 2
        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("525180");
    }

    @Test
    void neverBelowWhatTheCustomerAlreadySpent() {
        List<DeliveredOrderView> delivered = List.of(
                order("100000", "2021-01-01T10:00:00Z"),
                order("100000", "2026-01-01T10:00:00Z"));

        LifetimeValue.Snapshot snapshot = LifetimeValue.snapshot(delivered, CLOCK);
        assertThat(snapshot.historicalSpend()).isEqualByComparingTo("200000.00");
        assertThat(snapshot.ltv()).isGreaterThanOrEqualTo(snapshot.historicalSpend());
    }

    @Test
    void ordersOlderThanAYearStayInLifetimeValueButLeaveTheRfmWindow() {
        List<DeliveredOrderView> delivered = List.of(
                order("8000000", "2024-01-01T10:00:00Z"),
                order("100000", "2026-09-01T10:00:00Z"));

        LifetimeValue.Snapshot snapshot = LifetimeValue.snapshot(delivered, CLOCK);

        assertThat(snapshot.historicalSpend()).isEqualByComparingTo("8100000.00");
        assertThat(snapshot.windowOrderCount()).isEqualTo(1);
        assertThat(snapshot.windowSpend()).isEqualByComparingTo("100000.00");
        assertThat(snapshot.lastPurchaseAt()).isEqualTo(Instant.parse("2026-09-01T10:00:00Z"));
    }

    @Test
    void orderOnTheWindowBoundaryStillCounts() {
        LifetimeValue.Snapshot onTheDay = LifetimeValue.snapshot(
                List.of(order("50000", "2025-09-23T08:00:00Z")), CLOCK);
        LifetimeValue.Snapshot oneSecondEarlier = LifetimeValue.snapshot(
                List.of(order("50000", "2025-09-23T07:59:59Z")), CLOCK);

        assertThat(onTheDay.windowOrderCount()).isEqualTo(1);
        assertThat(onTheDay.windowSpend()).isEqualByComparingTo("50000.00");
        assertThat(oneSecondEarlier.windowOrderCount()).isZero();
        assertThat(oneSecondEarlier.windowSpend()).isEqualByComparingTo("0.00");
        assertThat(oneSecondEarlier.historicalSpend()).isEqualByComparingTo("50000.00");
    }

    private static DeliveredOrderView order(String amount, String deliveredAt) {
        return new DeliveredOrderView(
                UUID.randomUUID(),
                UUID.randomUUID(),
                new BigDecimal(amount),
                Instant.parse(deliveredAt),
                List.of(new DeliveredOrderLine(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Đĩa game",
                        new BigDecimal(amount))));
    }
}
