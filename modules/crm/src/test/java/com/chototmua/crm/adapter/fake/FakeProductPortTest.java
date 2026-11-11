package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Kiểm tra bản giả lập danh mục: tồn tại đang bán, lọc từng tiêu chí, bán chạy. */
class FakeProductPortTest {

    private static final UUID CAT_CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID CAT_ACCESSORY = UUID.fromString("01010101-0000-0000-0000-000000000003");

    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID SWITCH_PRO = UUID.fromString("02020202-0000-0000-0000-000000000003");
    private static final UUID ELDEN = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID DOCK = UUID.fromString("02020202-0000-0000-0000-000000000011");
    private static final UUID DRAFT_PAD = UUID.fromString("02020202-0000-0000-0000-00000000aa");

    private FakeProductPort products;

    @BeforeEach
    void setUp() {
        products = new FakeProductPort();
        seedCatalog();
    }

    @Test
    void unknownProductIsNotActive() {
        assertThat(products.existsActive(UUID.randomUUID())).isFalse();
    }

    @Test
    void seededActiveProductExists() {
        UUID id = UUID.randomUUID();
        products.seedActive(id);
        assertThat(products.existsActive(id)).isTrue();
    }

    @Test
    void seededInactiveProductDoesNotExistAsActive() {
        UUID id = UUID.randomUUID();
        products.seedInactive(id);
        assertThat(products.existsActive(id)).isFalse();
    }

    @Test
    void findReturnsSeededProductAndEmptyWhenUnknown() {
        assertThat(products.find(DUALSENSE)).hasValueSatisfying(view -> {
            assertThat(view.name()).isEqualTo("Tay cầm DualSense");
            assertThat(view.productType()).isEqualTo("controller");
            assertThat(view.platforms()).containsExactly("PS5");
        });
        assertThat(products.find(UUID.randomUUID())).isEmpty();
    }

    @Test
    void searchByKeywordMatchesNameOrBrand() {
        assertThat(products.search(filter("dual", null, null, null, null, null, null, false)))
                .extracting(ProductView::id)
                .containsExactly(DUALSENSE);
        assertThat(products.search(filter("sony", null, null, null, null, null, null, false)))
                .extracting(ProductView::id)
                .containsExactly(DUALSENSE);
    }

    @Test
    void searchByProductType() {
        assertThat(products.search(filter(null, "game_disc", null, null, null, null, null, false)))
                .extracting(ProductView::id)
                .containsExactlyInAnyOrder(ELDEN, FIFA);
    }

    @Test
    void searchByCategory() {
        assertThat(products.search(filter(null, null, CAT_CONTROLLER, null, null, null, null, false)))
                .extracting(ProductView::id)
                .containsExactlyInAnyOrder(SWITCH_PRO, DUALSENSE, DRAFT_PAD);
    }

    @Test
    void searchByGenre() {
        assertThat(products.search(filter(null, null, null, "nhập vai", null, null, null, false)))
                .extracting(ProductView::id)
                .containsExactly(ELDEN);
    }

    @Test
    void searchByPlatform() {
        assertThat(products.search(filter(null, null, null, null, "ps5", null, null, false)))
                .extracting(ProductView::id)
                .containsExactlyInAnyOrder(ELDEN, FIFA, DUALSENSE);
    }

    @Test
    void searchByPriceRange() {
        assertThat(products.search(filter(
                        null, null, null, null, null,
                        new BigDecimal("1000000"), new BigDecimal("2000000"), false)))
                .extracting(ProductView::id)
                .containsExactlyInAnyOrder(SWITCH_PRO, DUALSENSE, ELDEN);
    }

    @Test
    void searchPublishedOnlyExcludesDraft() {
        List<ProductView> all = products.search(filter(null, "controller", null, null, null, null, null, false));
        List<ProductView> published = products.search(filter(null, "controller", null, null, null, null, null, true));
        assertThat(all).extracting(ProductView::id).containsExactlyInAnyOrder(DRAFT_PAD, DUALSENSE, SWITCH_PRO);
        assertThat(published).extracting(ProductView::id).containsExactlyInAnyOrder(SWITCH_PRO, DUALSENSE);
        assertThat(products.existsActive(DRAFT_PAD)).isFalse();
    }

    @Test
    void searchCombinesCriteria() {
        assertThat(products.search(filter(
                        "đĩa", "game_disc", CAT_DISC, "Thể thao", "PS5",
                        new BigDecimal("500000"), new BigDecimal("1500000"), true)))
                .extracting(ProductView::id)
                .containsExactly(FIFA);
    }

    @Test
    void topSellersOrdersByQuantityInWindowAndRespectsLimit() {
        Instant from = Instant.parse("2026-07-01T00:00:00Z");
        Instant to = Instant.parse("2026-09-30T23:59:59Z");
        products.seedSale(FIFA, Instant.parse("2026-08-01T10:00:00Z"), 5);
        products.seedSale(DUALSENSE, Instant.parse("2026-08-20T10:00:00Z"), 3);
        products.seedSale(ELDEN, Instant.parse("2026-09-01T10:00:00Z"), 8);
        products.seedSale(SWITCH_PRO, Instant.parse("2026-01-01T10:00:00Z"), 99);
        products.seedSale(DOCK, Instant.parse("2026-08-15T10:00:00Z"), 1);

        assertThat(products.topSellers(from, to, 3))
                .extracting(ProductView::id)
                .containsExactly(ELDEN, FIFA, DUALSENSE);
        assertThat(products.topSellers(from, to, 1))
                .extracting(ProductView::id)
                .containsExactly(ELDEN);
    }

    private void seedCatalog() {
        products.seed(new ProductView(
                DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("PS5"),
                new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5", "PS4"),
                new BigDecimal("990000"), "published"));
        products.seed(new ProductView(
                SWITCH_PRO, "Tay cầm Switch Pro", "Nintendo", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("Switch"),
                new BigDecimal("1590000"), "published"));
        products.seed(new ProductView(
                ELDEN, "Đĩa Elden Ring", "Bandai Namco", "game_disc",
                CAT_DISC, "Đĩa game", "Nhập vai", List.of("PS5", "Xbox"),
                new BigDecimal("1190000"), "published"));
        products.seed(new ProductView(
                DOCK, "Dock Nintendo Switch", "Nintendo", "accessory",
                CAT_ACCESSORY, "Phụ kiện", null, List.of("Switch"),
                new BigDecimal("890000"), "published"));
        products.seed(new ProductView(
                DRAFT_PAD, "Tay cầm nháp", "OEM", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("PC"),
                new BigDecimal("199000"), "draft"));
    }

    private static ProductFilter filter(
            String keyword,
            String productType,
            UUID categoryId,
            String genre,
            String platform,
            BigDecimal priceMin,
            BigDecimal priceMax,
            boolean publishedOnly
    ) {
        return new ProductFilter(keyword, productType, categoryId, genre, platform, priceMin, priceMax, publishedOnly);
    }
}
