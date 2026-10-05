package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Kiểm tra bản giả lập đơn: tồn tại theo khách và chỉ trả đơn đã giao của khách đó. */
class FakeOrderPortTest {

    private FakeOrderPort orders;

    @BeforeEach
    void setUp() {
        orders = new FakeOrderPort();
    }

    @Test
    void unknownOrderDoesNotExist() {
        assertThat(orders.existsOrder(UUID.randomUUID(), UUID.randomUUID())).isFalse();
    }

    @Test
    void seededOrderExistsForThatUserOnly() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        orders.seedOrder(userId, orderId);

        assertThat(orders.existsOrder(userId, orderId)).isTrue();
        assertThat(orders.existsOrder(UUID.randomUUID(), orderId)).isFalse();
    }

    @Test
    void listDeliveredOrdersReturnsOnlySeededDeliveredForUser() {
        UUID userId = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        DeliveredOrderView delivered = new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal("1500000"),
                Instant.parse("2026-09-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Tay cầm",
                        new BigDecimal("1500000"))));

        orders.seedDeliveredOrder(delivered);
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                otherUser,
                BigDecimal.TEN,
                Instant.parse("2026-09-02T10:00:00Z"),
                List.of()));

        List<DeliveredOrderView> result = orders.listDeliveredOrders(userId);
        assertThat(result).containsExactly(delivered);
    }
}
