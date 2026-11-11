package com.chototmua.crm.application.recommendation;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.campaign.CampaignService;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.domain.notification.AppNotification;
import com.chototmua.crm.domain.recommendation.Recommendation;
import com.chototmua.crm.domain.recommendation.RecommendationReason;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.RecommendationListResponse;
import com.chototmua.crm.web.dto.RecommendationPushResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Năm nhánh gợi ý: bán chạy quý, máy→tay cầm, máy+tay cầm→đĩa, đĩa cùng genre, mua chung. */
class RecommendationServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-17T08:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SALES = UUID.fromString("55555555-5555-5555-5555-555555555555");

    private static final UUID CAT_CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID CAT_ACCESSORY = UUID.fromString("01010101-0000-0000-0000-000000000003");

    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID SWITCH_PRO = UUID.fromString("02020202-0000-0000-0000-000000000003");
    private static final UUID ELDEN = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID NBA = UUID.fromString("02020202-0000-0000-0000-000000000008");
    private static final UUID DOCK = UUID.fromString("02020202-0000-0000-0000-000000000011");
    private static final UUID DRAFT_PAD = UUID.fromString("02020202-0000-0000-0000-00000000aa");
    private static final UUID DRAFT_DISC = UUID.fromString("02020202-0000-0000-0000-00000000bb");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private FakeProductPort products;
    private InMemoryNotificationStore notifications;
    private RecommendationService service;
    private CustomerView guest;
    private CustomerView other;
    private CustomerView locked;
    private CustomerView deleted;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        products = new FakeProductPort();
        notifications = new InMemoryNotificationStore();
        service = new RecommendationService(identity, orders, products, notifications, CLOCK);
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        identity.seedStaff(SALES, StaffDepartment.SALES);
        guest = identity.seedCustomer("An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        other = identity.seedCustomer("Binh", "female", LocalDate.of(2000, 1, 1), CustomerStatus.ACTIVE);
        locked = identity.seedCustomer("Khoa", "male", LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);
        deleted = identity.seedCustomer("Xoa", "female", LocalDate.of(1991, 1, 1), CustomerStatus.DELETED);
        seedCatalog();
        seedQuarterSales();
    }

    @Test
    void newCustomerGetsQuarterBestSellersInSoldOrder() {
        List<Recommendation> recs = service.recommend(guest.id(), 5);

        assertThat(recs).extracting(row -> row.product().id())
                .containsExactly(ELDEN, FIFA, DUALSENSE, NBA, DOCK);
        assertThat(recs).allMatch(row -> row.reason() == RecommendationReason.NEW_CUSTOMER_BEST_SELLER);
        assertThat(recs).noneMatch(row -> DRAFT_PAD.equals(row.product().id()) || DRAFT_DISC.equals(row.product().id()));
        assertThat(recs).noneMatch(row -> SWITCH_PRO.equals(row.product().id()));
    }

    @Test
    void accessoryWithoutControllerSuggestsPublishedControllers() {
        purchase(guest.id(), DOCK, null);

        List<Recommendation> recs = service.recommend(guest.id(), 5);

        assertThat(recs).extracting(row -> row.product().id()).startsWith(DUALSENSE, SWITCH_PRO);
        assertThat(recs.get(0).reason()).isEqualTo(RecommendationReason.ACCESSORY_NEEDS_CONTROLLER);
        assertThat(recs.get(1).reason()).isEqualTo(RecommendationReason.ACCESSORY_NEEDS_CONTROLLER);
        assertThat(recs).noneMatch(row -> DOCK.equals(row.product().id()));
        assertThat(recs).noneMatch(row -> DRAFT_PAD.equals(row.product().id()));
    }

    @Test
    void accessoryAndControllerWithoutDiscSuggestsBestSellerDiscs() {
        purchase(guest.id(), DOCK, null);
        purchase(guest.id(), DUALSENSE, null);

        List<Recommendation> recs = service.recommend(guest.id(), 4);

        assertThat(recs).extracting(row -> row.product().id()).containsExactly(ELDEN, FIFA, NBA);
        assertThat(recs).allMatch(row -> row.reason() == RecommendationReason.CONSOLE_NEEDS_GAME_DISC);
        assertThat(recs).noneMatch(row -> DUALSENSE.equals(row.product().id()) || DOCK.equals(row.product().id()));
        assertThat(recs).noneMatch(row -> DRAFT_DISC.equals(row.product().id()));
    }

    @Test
    void gameDiscSuggestsSameGenreExcludingOwned() {
        purchase(guest.id(), FIFA, "Thể thao");

        List<Recommendation> recs = service.recommend(guest.id(), 5);

        assertThat(recs.get(0).product().id()).isEqualTo(NBA);
        assertThat(recs.get(0).reason()).isEqualTo(RecommendationReason.SAME_GENRE_GAME_DISC);
        assertThat(recs).noneMatch(row -> FIFA.equals(row.product().id()));
        assertThat(recs).noneMatch(row -> DRAFT_DISC.equals(row.product().id()));
        assertThat(recs.stream().filter(row -> row.reason() == RecommendationReason.SAME_GENRE_GAME_DISC)
                .map(row -> row.product().id())).containsExactly(NBA);
    }

    @Test
    void coPurchaseFillsAfterRulesAndSkipsOwnedAndDraft() {
        purchase(guest.id(), DUALSENSE, null);
        basket(other.id(), List.of(DUALSENSE, ELDEN));
        basket(other.id(), List.of(DUALSENSE, ELDEN, FIFA));
        basket(locked.id(), List.of(DUALSENSE, DRAFT_PAD));

        List<Recommendation> recs = service.recommend(guest.id(), 5);

        assertThat(recs).extracting(row -> row.product().id()).containsExactly(ELDEN, FIFA);
        assertThat(recs).allMatch(row -> row.reason() == RecommendationReason.CO_PURCHASE);
        assertThat(recs).noneMatch(row -> DUALSENSE.equals(row.product().id()));
        assertThat(recs).noneMatch(row -> DRAFT_PAD.equals(row.product().id()));
    }

    @Test
    void neverIncludesOwnedOrUnpublishedProducts() {
        purchase(guest.id(), FIFA, "Thể thao");
        purchase(guest.id(), DUALSENSE, null);
        basket(other.id(), List.of(FIFA, DRAFT_DISC, DRAFT_PAD, ELDEN));

        List<Recommendation> recs = service.recommend(guest.id(), 10);

        assertThat(recs).extracting(row -> row.product().id())
                .doesNotContain(FIFA, DUALSENSE, DRAFT_PAD, DRAFT_DISC);
        assertThat(recs).allMatch(row -> "published".equals(row.product().status()));
    }

    @Test
    void staffCanListAnyCustomer() {
        RecommendationListResponse body = service.list(ADMIN, guest.id(), 3);
        assertThat(body.userId()).isEqualTo(guest.id());
        assertThat(body.items()).hasSize(3);
        assertThat(body.items().get(0).reason()).isEqualTo(RecommendationReason.NEW_CUSTOMER_BEST_SELLER.name());
    }

    @Test
    void salesStaffCannotList() {
        assertThatThrownBy(() -> service.list(SALES, guest.id(), 3))
                .isInstanceOf(CrmForbiddenException.class)
                .hasMessageContaining("quyền");
    }

    @Test
    void customerCanListOwnButNotAnother() {
        RecommendationListResponse own = service.list(guest.id(), guest.id(), 2);
        assertThat(own.items()).isNotEmpty();

        assertThatThrownBy(() -> service.list(guest.id(), other.id(), 2))
                .isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void missingCustomerIsNotFound() {
        assertThatThrownBy(() -> service.list(ADMIN, UUID.randomUUID(), 3))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    @Test
    void pushToActiveCustomerCreatesInAppCampaignNotification() {
        RecommendationPushResponse sent = service.pushToCustomer(ADMIN, guest.id(), 3);

        assertThat(sent.sentCount()).isEqualTo(1);
        assertThat(sent.skipped()).isEmpty();
        assertThat(sent.referenceType()).isEqualTo(CampaignService.REFERENCE_CAMPAIGN);
        List<AppNotification> inbox = notifications.findByUser(guest.id());
        assertThat(inbox).hasSize(1);
        assertThat(inbox.get(0).referenceType()).isEqualTo("campaign");
        assertThat(inbox.get(0).channel()).isEqualTo("in_app");
        assertThat(inbox.get(0).content()).contains("Gợi ý dành cho bạn");
        assertThat(inbox.get(0).content()).contains("Đĩa Elden Ring");
    }

    @Test
    void pushOnlySelectedRecommendedProducts() {
        RecommendationPushResponse sent = service.pushToCustomer(ADMIN, guest.id(), 10, List.of(FIFA));

        assertThat(sent.sentCount()).isEqualTo(1);
        String content = notifications.findByUser(guest.id()).get(0).content();
        assertThat(content).contains("Đĩa EA FC 25");
        assertThat(content).doesNotContain("Đĩa Elden Ring");
    }

    @Test
    void pushSkipsLockedAndDeleted() {
        assertThat(service.pushToCustomer(ADMIN, locked.id(), 3).sentCount()).isZero();
        assertThat(service.pushToCustomer(ADMIN, deleted.id(), 3).sentCount()).isZero();
        assertThat(service.pushToCustomer(ADMIN, locked.id(), 3).skipped())
                .extracting(row -> row.status())
                .containsExactly(CustomerStatus.LOCKED);
        assertThat(notifications.findByUser(locked.id())).isEmpty();
        assertThat(notifications.findByUser(deleted.id())).isEmpty();
    }

    @Test
    void salesCannotPush() {
        assertThatThrownBy(() -> service.pushToCustomer(SALES, guest.id(), 3))
                .isInstanceOf(CrmForbiddenException.class);
    }

    private void seedCatalog() {
        products.seed(product(DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("PS5"), "1890000", "published"));
        products.seed(product(FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5"), "990000", "published"));
        products.seed(product(SWITCH_PRO, "Tay cầm Switch Pro", "Nintendo", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("Switch"), "1590000", "published"));
        products.seed(product(ELDEN, "Đĩa Elden Ring", "Bandai Namco", "game_disc",
                CAT_DISC, "Đĩa game", "Nhập vai", List.of("PS5"), "1190000", "published"));
        products.seed(product(NBA, "Đĩa NBA 2K", "2K", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5"), "890000", "published"));
        products.seed(product(DOCK, "Dock Nintendo Switch", "Nintendo", "accessory",
                CAT_ACCESSORY, "Phụ kiện", null, List.of("Switch"), "890000", "published"));
        products.seed(product(DRAFT_PAD, "Tay cầm nháp", "OEM", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("PC"), "199000", "draft"));
        products.seed(product(DRAFT_DISC, "Đĩa nháp thể thao", "OEM", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5"), "99000", "draft"));
    }

    private void seedQuarterSales() {
        Instant inWindow = Instant.parse("2026-08-20T10:00:00Z");
        Instant outside = Instant.parse("2026-01-01T10:00:00Z");
        products.seedSale(ELDEN, inWindow, 8);
        products.seedSale(FIFA, inWindow, 5);
        products.seedSale(DUALSENSE, inWindow, 3);
        products.seedSale(NBA, inWindow, 2);
        products.seedSale(DOCK, inWindow, 1);
        products.seedSale(DRAFT_PAD, inWindow, 99);
        products.seedSale(DRAFT_DISC, inWindow, 50);
        products.seedSale(SWITCH_PRO, outside, 80);
    }

    private void purchase(UUID userId, UUID productId, String genre) {
        ProductView product = products.find(productId).orElseThrow();
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                product.price(),
                Instant.parse("2026-09-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        product.id(),
                        product.categoryId(),
                        product.categoryName(),
                        product.price(),
                        genre))));
    }

    private void basket(UUID userId, List<UUID> productIds) {
        List<DeliveredOrderLine> lines = productIds.stream()
                .map(id -> {
                    ProductView product = products.find(id).orElseThrow();
                    return new DeliveredOrderLine(
                            product.id(),
                            product.categoryId(),
                            product.categoryName(),
                            product.price(),
                            product.genre());
                })
                .toList();
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.ONE,
                Instant.parse("2026-09-02T10:00:00Z"),
                lines));
    }

    private static ProductView product(
            UUID id,
            String name,
            String brand,
            String type,
            UUID categoryId,
            String categoryName,
            String genre,
            List<String> platforms,
            String price,
            String status
    ) {
        return new ProductView(
                id, name, brand, type, categoryId, categoryName, genre, platforms,
                new BigDecimal(price), status);
    }
}
