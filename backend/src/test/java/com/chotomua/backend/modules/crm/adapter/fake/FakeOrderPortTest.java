package com.chotomua.backend.modules.crm.adapter.fake;

import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Kiểm tra bản giả lập đơn: tồn tại theo khách, đơn delivered, người mua, mua chung. */
class FakeOrderPortTest {

    private static final UUID USER_AN = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    private static final UUID USER_BINH = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    private static final UUID USER_CHAU = UUID.fromString("cccc3333-3333-3333-3333-333333333333");

    private static final UUID PRODUCT_A = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID PRODUCT_B = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID PRODUCT_C = UUID.fromString("02020202-0000-0000-0000-000000000003");
    private static final UUID PRODUCT_D = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID CAT_PAD = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");

    private static final UUID ORDER_AN_AB = UUID.fromString("aaaa0001-0000-0000-0000-000000000001");
    private static final UUID ORDER_BINH_ABC = UUID.fromString("bbbb0001-0000-0000-0000-000000000001");
    private static final UUID ORDER_CHAU_AD = UUID.fromString("cccc0001-0000-0000-0000-000000000001");
    private static final UUID ORDER_PENDING = UUID.fromString("eeee0001-0000-0000-0000-000000000099");

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

    @Test
    void getDeliveredOrderReturnsLinesAndEmptyWhenNotDelivered() {
        seedBasket();
        orders.seedOrder(USER_AN, ORDER_PENDING);

        Optional<DeliveredOrderView> found = orders.getDeliveredOrder(ORDER_AN_AB);
        assertThat(found).isPresent();
        assertThat(found.get().userId()).isEqualTo(USER_AN);
        assertThat(found.get().lines())
                .extracting(DeliveredOrderLine::productId, DeliveredOrderLine::categoryId, DeliveredOrderLine::genre)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(PRODUCT_A, CAT_PAD, null),
                        org.assertj.core.groups.Tuple.tuple(PRODUCT_B, CAT_DISC, "Thể thao"));

        assertThat(orders.getDeliveredOrder(ORDER_PENDING)).isEmpty();
        assertThat(orders.getDeliveredOrder(UUID.randomUUID())).isEmpty();
    }

    @Test
    void findBuyersOfProductsUnionsDistinctUsers() {
        seedBasket();

        assertThat(orders.findBuyersOfProducts(List.of(PRODUCT_A)))
                .containsExactlyInAnyOrder(USER_AN, USER_BINH, USER_CHAU);
        assertThat(orders.findBuyersOfProducts(List.of(PRODUCT_C)))
                .containsExactly(USER_BINH);
        assertThat(orders.findBuyersOfProducts(List.of(PRODUCT_A, PRODUCT_C)))
                .containsExactlyInAnyOrder(USER_AN, USER_BINH, USER_CHAU);
        assertThat(orders.findBuyersOfProducts(List.of(UUID.randomUUID()))).isEmpty();
        assertThat(orders.findBuyersOfProducts(List.of())).isEmpty();
    }

    @Test
    void coPurchasedExcludesOwnedRanksByFrequencyAndRespectsLimit() {
        seedBasket();

        List<UUID> ranked = orders.coPurchasedProducts(Set.of(PRODUCT_A), 10);
        assertThat(ranked).containsExactly(PRODUCT_B, PRODUCT_C, PRODUCT_D);
        assertThat(orders.coPurchasedProducts(Set.of(PRODUCT_A), 1)).containsExactly(PRODUCT_B);
        assertThat(orders.coPurchasedProducts(Set.of(PRODUCT_A, PRODUCT_B, PRODUCT_C, PRODUCT_D), 5)).isEmpty();
        assertThat(orders.coPurchasedProducts(List.of(), 5)).isEmpty();
    }

    private void seedBasket() {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                ORDER_AN_AB,
                USER_AN,
                new BigDecimal("2880000"),
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(
                        line(PRODUCT_A, CAT_PAD, "Tay cầm", "1890000", null),
                        line(PRODUCT_B, CAT_DISC, "Đĩa game", "990000", "Thể thao"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                ORDER_BINH_ABC,
                USER_BINH,
                new BigDecimal("4470000"),
                Instant.parse("2026-09-01T10:00:00Z"),
                List.of(
                        line(PRODUCT_A, CAT_PAD, "Tay cầm", "1890000", null),
                        line(PRODUCT_B, CAT_DISC, "Đĩa game", "990000", "Thể thao"),
                        line(PRODUCT_C, CAT_PAD, "Tay cầm", "1590000", null))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                ORDER_CHAU_AD,
                USER_CHAU,
                new BigDecimal("3080000"),
                Instant.parse("2026-08-18T10:00:00Z"),
                List.of(
                        line(PRODUCT_A, CAT_PAD, "Tay cầm", "1890000", null),
                        line(PRODUCT_D, CAT_DISC, "Đĩa game", "1190000", "Nhập vai"))));
    }

    private static DeliveredOrderLine line(
            UUID productId, UUID categoryId, String categoryName, String total, String genre
    ) {
        return new DeliveredOrderLine(productId, categoryId, categoryName, new BigDecimal(total), genre);
    }
}
