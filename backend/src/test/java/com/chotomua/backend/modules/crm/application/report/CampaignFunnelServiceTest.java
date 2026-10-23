package com.chotomua.backend.modules.crm.application.report;

import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.campaign.CampaignService;
import com.chotomua.backend.modules.crm.application.campaign.InMemoryCampaignProductTargetStore;
import com.chotomua.backend.modules.crm.application.campaign.InMemoryCampaignStore;
import com.chotomua.backend.modules.crm.application.exception.CampaignNotFoundException;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.segment.InMemorySegmentStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyStore;
import com.chotomua.backend.modules.crm.domain.segment.CustomerSegment;
import com.chotomua.backend.modules.crm.domain.segment.SegmentMember;
import com.chotomua.backend.modules.crm.domain.segment.SegmentRule;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import com.chotomua.backend.modules.crm.web.dto.CampaignFunnelResponse;
import com.chotomua.backend.modules.crm.web.dto.CampaignResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Funnel suy ra: đơn trước giờ gửi không tính; đơn sau giờ gửi chứa sản phẩm mục tiêu mới tính. */
class CampaignFunnelServiceTest {

    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAT = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private FakeProductPort products;
    private InMemorySegmentStore segments;
    private CampaignService campaigns;
    private CampaignFunnelService funnels;
    private CustomerView an;
    private CustomerView binh;
    private UUID segmentId;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        products = new FakeProductPort();
        segments = new InMemorySegmentStore();
        InMemoryCampaignStore campaignStore = new InMemoryCampaignStore();
        InMemoryCampaignProductTargetStore productTargets = new InMemoryCampaignProductTargetStore();
        InMemoryNotificationStore notifications = new InMemoryNotificationStore();
        campaigns = new CampaignService(
                identity, orders, products, segments, campaignStore, productTargets,
                notifications, new InMemorySurveyStore());
        funnels = new CampaignFunnelService(
                identity, orders, products, campaignStore, productTargets, notifications);
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        products.seed(new ProductView(
                DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT, "Tay cầm", null, List.of("PS5"), new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT, "Đĩa game", "Thể thao", List.of("PS5"), new BigDecimal("990000"), "published"));
        Instant seededAt = Instant.now().minus(10, ChronoUnit.DAYS);
        an = identity.seedCustomer("An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        binh = identity.seedCustomer("Binh", "female", LocalDate.of(2000, 1, 1), CustomerStatus.ACTIVE);
        segmentId = UUID.randomUUID();
        segments.save(
                new CustomerSegment(segmentId, "VIP", new SegmentRule(
                        null, null, null, null, null, null, null, null, null), seededAt),
                List.of(
                        new SegmentMember(segmentId, an.id(), seededAt),
                        new SegmentMember(segmentId, binh.id(), seededAt)));
        seedPurchase(an.id(), DUALSENSE, seededAt);
        seedPurchase(binh.id(), DUALSENSE, seededAt);
    }

    @Test
    void purchaseAfterStartAtWithTargetProductCountsAsConverted() {
        CampaignResponse sent = sendProductCampaign(null);
        seedPurchase(an.id(), DUALSENSE, sent.startAt().plus(2, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.targeted()).isEqualTo(2);
        assertThat(funnel.sent()).isEqualTo(2);
        assertThat(funnel.converted()).isEqualTo(1);
        assertThat(funnel.convertible()).isTrue();
        assertThat(funnel.conversionRate()).isEqualByComparingTo("50.00");
        assertThat(funnel.productIds()).containsExactly(DUALSENSE);
        assertThat(funnel.windowFrom()).isEqualTo(sent.startAt());
        assertThat(funnel.windowTo()).isEqualTo(sent.startAt().plus(30, ChronoUnit.DAYS));
        assertThat(funnel.stages()).extracting(stage -> stage.bucket())
                .containsExactly("targeted", "sent", "converted");
        assertThat(funnel.stages()).extracting(stage -> stage.count())
                .containsExactly(2L, 2L, 1L);
    }

    @Test
    void purchaseBeforeStartAtDoesNotCount() {
        CampaignResponse sent = sendProductCampaign(null);
        seedPurchase(an.id(), DUALSENSE, sent.startAt().minus(1, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.sent()).isEqualTo(2);
        assertThat(funnel.converted()).isEqualTo(0);
        assertThat(funnel.conversionRate()).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
    }

    @Test
    void purchaseOutsideDefaultThirtyDayWindowDoesNotCount() {
        CampaignResponse sent = sendProductCampaign(null);
        seedPurchase(an.id(), DUALSENSE, sent.startAt().plus(31, ChronoUnit.DAYS));

        assertThat(funnels.build(ADMIN, sent.id()).converted()).isEqualTo(0);
    }

    @Test
    void purchaseAfterEndAtDoesNotCount() {
        Instant endAt = Instant.now().plus(7, ChronoUnit.DAYS);
        CampaignResponse sent = sendProductCampaign(endAt);
        seedPurchase(an.id(), DUALSENSE, endAt.plusSeconds(1));
        seedPurchase(binh.id(), DUALSENSE, sent.startAt().plus(3, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.windowTo()).isEqualTo(endAt);
        assertThat(funnel.converted()).isEqualTo(1);
    }

    @Test
    void segmentOnlyCampaignIsNotConvertible() {
        CampaignResponse sent = campaigns.send(
                ADMIN, "Chăm sóc VIP", List.of(segmentId), "Xin chào",
                null, null, null, null, null);
        seedPurchase(an.id(), FIFA, sent.startAt().plus(1, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.targeted()).isEqualTo(2);
        assertThat(funnel.sent()).isEqualTo(2);
        assertThat(funnel.convertible()).isFalse();
        assertThat(funnel.converted()).isEqualTo(0);
        assertThat(funnel.productIds()).isEmpty();
    }

    @Test
    void filterTargetResolvesProductsForConversion() {
        CampaignResponse sent = campaigns.send(
                ADMIN, "Đĩa game", List.of(segmentId), "Game mới",
                null, null, null, null,
                new ProductFilter(null, "game_disc", null, null, null, null, null, true));
        seedPurchase(an.id(), FIFA, sent.startAt().plus(1, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.convertible()).isTrue();
        assertThat(funnel.productIds()).contains(FIFA);
        assertThat(funnel.converted()).isEqualTo(1);
    }

    @Test
    void scheduledCampaignHasTargetedButNotSent() {
        Instant later = Instant.now().plus(2, ChronoUnit.DAYS);
        CampaignResponse sent = campaigns.send(
                ADMIN, "Lên lịch", List.of(segmentId), "Sắp gửi",
                null, later, null, List.of(DUALSENSE), null);
        seedPurchase(an.id(), DUALSENSE, later.plus(1, ChronoUnit.DAYS));

        CampaignFunnelResponse funnel = funnels.build(ADMIN, sent.id());

        assertThat(funnel.targeted()).isEqualTo(2);
        assertThat(funnel.sent()).isEqualTo(0);
        assertThat(funnel.converted()).isEqualTo(0);
    }

    @Test
    void unknownCampaignIsNotFound() {
        assertThatThrownBy(() -> funnels.build(ADMIN, UUID.randomUUID()))
                .isInstanceOf(CampaignNotFoundException.class);
    }

    private CampaignResponse sendProductCampaign(Instant endAt) {
        return campaigns.send(
                ADMIN, "Tay cầm DualSense", List.of(segmentId), "Ưu đãi tay cầm",
                null, null, endAt, List.of(DUALSENSE), null);
    }

    private void seedPurchase(UUID userId, UUID productId, Instant deliveredAt) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                deliveredAt,
                List.of(new DeliveredOrderLine(productId, CAT, "SP", BigDecimal.TEN))));
    }
}
