package com.chototmua.crm.domain.profile;

import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
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

    @Test
    void oneOrderThisYearUsesLifespanOfOneYear() {
        List<DeliveredOrderView> delivered = List.of(order("80000", "2026-07-01T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("80000.00");
    }

    @Test
    void twoOrdersThisYearMultiplyAnnualValueByDaySpanOver365() {
        List<DeliveredOrderView> delivered = List.of(
                order("150000", "2026-08-01T10:00:00Z"),
                order("100000", "2026-08-20T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("13013.70");
    }

    @Test
    void ordersOutsideCalendarYearDoNotCountTowardCustomerValue() {
        List<DeliveredOrderView> delivered = List.of(order("900000", "2025-12-31T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("0.00");
    }

    @Test
    void lifespanUsesFirstAndLastPurchaseAcrossYears() {
        List<DeliveredOrderView> delivered = List.of(
                order("100000", "2025-08-01T10:00:00Z"),
                order("200000", "2026-08-01T10:00:00Z"));

        assertThat(LifetimeValue.of(delivered, CLOCK)).isEqualByComparingTo("200000.00");
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
