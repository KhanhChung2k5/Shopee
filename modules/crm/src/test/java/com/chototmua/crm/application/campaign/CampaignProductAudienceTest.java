package com.chototmua.crm.application.campaign;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.exception.InvalidCampaignException;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.application.segment.InMemorySegmentStore;
import com.chototmua.crm.application.survey.InMemorySurveyStore;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.segment.SegmentRule;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.CampaignResponse;
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

/** Audience chiến dịch = segment ∪ người đã mua, không trùng, loại locked/deleted. */
class CampaignProductAudienceTest {

    private static final Instant NOW = Instant.parse("2026-10-17T08:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAT = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private FakeProductPort products;
    private InMemorySegmentStore segments;
    private InMemoryNotificationStore notifications;
    private CampaignService campaigns;
    private CustomerView an;
    private CustomerView binh;
    private CustomerView locked;
    private CustomerView deleted;
    private UUID segmentId;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        products = new FakeProductPort();
        segments = new InMemorySegmentStore();
        InMemoryCampaignStore campaignStore = new InMemoryCampaignStore();
        InMemoryCampaignProductTargetStore productTargets = new InMemoryCampaignProductTargetStore();
        notifications = new InMemoryNotificationStore();
        campaigns = new CampaignService(
                identity, orders, products, segments, campaignStore, productTargets,
                notifications, new InMemorySurveyStore(), CLOCK);
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        products.seed(new ProductView(
                DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT, "Tay cầm", null, List.of("PS5"), new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT, "Đĩa game", "Thể thao", List.of("PS5"), new BigDecimal("990000"), "published"));
        an = identity.seedCustomer("An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        binh = identity.seedCustomer("Binh", "female", LocalDate.of(2000, 1, 1), CustomerStatus.ACTIVE);
        locked = identity.seedCustomer("Khoa", "male", LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);
        deleted = identity.seedCustomer("Xoa", "female", LocalDate.of(1991, 1, 1), CustomerStatus.DELETED);
        segmentId = UUID.randomUUID();
        segments.save(
                new CustomerSegment(segmentId, "VIP", new SegmentRule(
                        null, null, null, null, null, null, null, null, null), NOW),
                List.of(new SegmentMember(segmentId, an.id(), NOW)));
        seedPurchase(an.id(), DUALSENSE);
        seedPurchase(binh.id(), DUALSENSE);
        seedPurchase(locked.id(), DUALSENSE);
        seedPurchase(deleted.id(), DUALSENSE);
        seedPurchase(binh.id(), FIFA);
    }

    @Test
    void audienceUnionsSegmentAndBuyersWithoutDuplicatesAndSkipsInactive() {
        CampaignResponse sent = campaigns.send(
                ADMIN, "Tay cầm DualSense", List.of(segmentId), "Ưu đãi tay cầm",
                null, null, null, List.of(DUALSENSE), null);

        assertThat(sent.sentCount()).isEqualTo(2);
        assertThat(sent.productIds()).containsExactly(DUALSENSE);
        assertThat(sent.skipped()).extracting(row -> row.status())
                .containsExactlyInAnyOrder(CustomerStatus.LOCKED, CustomerStatus.DELETED);
        assertThat(notifications.findByUser(an.id())).hasSize(1);
        assertThat(notifications.findByUser(binh.id())).hasSize(1);
        assertThat(notifications.findByUser(locked.id())).isEmpty();
        assertThat(notifications.findByUser(deleted.id())).isEmpty();
    }

    @Test
    void productTargetWithoutSegmentStillSendsToActiveBuyers() {
        CampaignResponse sent = campaigns.send(
                ADMIN, "Chỉ người đã mua", List.of(), "Cảm ơn đã mua",
                null, null, null, List.of(DUALSENSE), null);

        assertThat(sent.sentCount()).isEqualTo(2);
        assertThat(sent.segmentIds()).isEmpty();
        assertThat(notifications.findByUser(an.id())).hasSize(1);
        assertThat(notifications.findByUser(binh.id())).hasSize(1);
    }

    @Test
    void filterAddsBuyersOfMatchingProducts() {
        CustomerView chau = identity.seedCustomer(
                "Chau", "female", LocalDate.of(1995, 3, 3), CustomerStatus.ACTIVE);
        seedPurchase(chau.id(), FIFA);

        CampaignResponse sent = campaigns.send(
                ADMIN, "Đĩa game", List.of(segmentId), "Game mới",
                null, null, null, null,
                new ProductFilter(null, "game_disc", null, null, null, null, null, true));

        assertThat(sent.sentCount()).isEqualTo(3);
        assertThat(notifications.findByUser(an.id())).hasSize(1);
        assertThat(notifications.findByUser(binh.id())).hasSize(1);
        assertThat(notifications.findByUser(chau.id())).hasSize(1);
    }

    @Test
    void neitherSegmentNorProductIsRejected() {
        assertThatThrownBy(() -> campaigns.send(
                ADMIN, "Trống", List.of(), "Không ai", null, null, null, null, null))
                .isInstanceOf(InvalidCampaignException.class)
                .hasMessageContaining("phân khúc hoặc một sản phẩm");
    }

    private void seedPurchase(UUID userId, UUID productId) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                NOW,
                List.of(new DeliveredOrderLine(productId, CAT, "SP", BigDecimal.TEN))));
    }
}
