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

    /** LTV = average order value × orders per year × expected lifespan (3 years, or longer if already loyal longer). */
    @Test
    void oneRecentOrderProjectsOverTheThreeYearLifespan() {
        List<DeliveredOrderView> delivered = List.of(order("80000", "2026-07-01T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("240000.00");
    }

    @Test
    void customersWithUnderAYearCountAsOneYearOfPurchases() {
        List<DeliveredOrderView> delivered = List.of(
                order("150000", "2026-08-01T10:00:00Z"),
                order("100000", "2026-08-20T10:00:00Z"));

        // AOV 125,000 × 2 orders/year × 3 years
        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("750000.00");
    }

    @Test
    void lastYearsOrdersStillCountAfterNewYear() {
        List<DeliveredOrderView> delivered = List.of(order("900000", "2025-12-31T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("2700000.00");
    }

    @Test
    void purchaseRateIsSpreadOverTheYearsSinceTheFirstOrder() {
        List<DeliveredOrderView> delivered = List.of(
                order("100000", "2025-08-01T10:00:00Z"),
                order("200000", "2026-08-01T10:00:00Z"));

        // 417 days since the first order = 1.1425 years: 150,000 × (2 / 1.1425) × 3
        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("787770");
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
