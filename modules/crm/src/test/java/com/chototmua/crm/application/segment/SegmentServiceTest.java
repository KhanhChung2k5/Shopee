package com.chototmua.crm.application.segment;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.application.exception.InvalidSegmentRuleException;
import com.chototmua.crm.application.exception.SegmentLockedException;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.SegmentMemberResponse;
import com.chototmua.crm.web.dto.SegmentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Preset tuổi khớp fixture báo cáo T3. Khách khóa và đã xóa không vào thành viên mới.
 */
class SegmentServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 23);
    private static final Clock CLOCK = Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private static final UUID ACTOR = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private SegmentService segments;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        segments = new SegmentService(
                identity,
                orders,
                new InMemorySegmentStore(),
                new OrderCountRfmStub(orders, null, CLOCK),
                CLOCK);
        identity.seedStaff(ACTOR, StaffDepartment.ADMIN);
    }

    @Test
    void agePresetKeepsOnlyThe18To24CustomerFromTheReportFixture() {
        CustomerView under18 = identity.seedCustomer(
                "Tre", "male", TODAY.minusYears(10), CustomerStatus.ACTIVE);
        CustomerView young = identity.seedCustomer(
                "Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView adult = identity.seedCustomer(
                "Trung", null, TODAY.minusYears(30), CustomerStatus.ACTIVE);
        seedLine(under18.id(), CONTROLLER, "Tay cầm");
        seedLine(young.id(), CONTROLLER, "Tay cầm");
        seedLine(adult.id(), DISC, "Đĩa game");

        SegmentResponse created = segments.create(ACTOR, "18–24", Map.of(
                "preset", "age",
                "bucket", "18–24"));

        assertThat(created.memberCount()).isEqualTo(1);
        assertThat(created.members()).extracting(SegmentMemberResponse::fullName).containsExactly("Tre Vua");
        assertThat(created.members()).extracting(SegmentMemberResponse::userId).containsExactly(young.id());
        assertThat(created.ruleDefinition()).containsEntry("preset", "age").containsEntry("bucket", "18–24");
    }

    @Test
    void hyphenAgeBucketMatchesTheSamePreset() {
        identity.seedCustomer("Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);

        SegmentResponse created = segments.create(ACTOR, "18-24", Map.of(
                "preset", "age",
                "bucket", "18-24"));

        assertThat(created.ruleDefinition()).containsEntry("bucket", "18–24");
        assertThat(created.members()).extracting(SegmentMemberResponse::fullName).containsExactly("Tre Vua");
    }

    @Test
    void allAgeBucketKeepsEveryActiveCustomer() {
        identity.seedCustomer("Tre", "male", TODAY.minusYears(10), CustomerStatus.ACTIVE);
        identity.seedCustomer("Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        identity.seedCustomer("Khoa", "male", TODAY.minusYears(20), CustomerStatus.LOCKED);

        SegmentResponse created = segments.create(ACTOR, "Mọi tuổi", Map.of(
                "preset", "age",
                "bucket", "all"));

        assertThat(created.members()).extracting(SegmentMemberResponse::fullName)
                .containsExactly("Tre", "Tre Vua");
    }

    @Test
    void lockedAndDeletedCustomersDoNotBecomeNewMembers() {
        identity.seedCustomer("Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        identity.seedCustomer("Khoa", "male", TODAY.minusYears(20), CustomerStatus.LOCKED);
        identity.seedCustomer("Xoa", "female", TODAY.minusYears(20), CustomerStatus.DELETED);

        SegmentResponse created = segments.create(ACTOR, "18–24", Map.of(
                "preset", "age",
                "bucket", "18–24"));

        assertThat(created.memberCount()).isEqualTo(1);
        assertThat(created.members()).extracting(SegmentMemberResponse::fullName).containsExactly("Tre Vua");
    }

    @Test
    void refreshDropsACustomerWhoWasLockedAfterJoining() {
        CustomerView young = identity.seedCustomer(
                "Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        SegmentResponse created = segments.create(ACTOR, "18–24", Map.of(
                "preset", "age",
                "bucket", "18–24"));
        assertThat(created.memberCount()).isEqualTo(1);

        identity.lock(young.id());

        SegmentResponse refreshed = segments.refresh(ACTOR, created.id());

        assertThat(refreshed.memberCount()).isZero();
        assertThat(refreshed.members()).isEmpty();
    }

    @Test
    void categoryPresetUsesDeliveredOrderLines() {
        CustomerView under18 = identity.seedCustomer(
                "Tre", "male", TODAY.minusYears(10), CustomerStatus.ACTIVE);
        CustomerView young = identity.seedCustomer(
                "Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView adult = identity.seedCustomer(
                "Trung", null, TODAY.minusYears(30), CustomerStatus.ACTIVE);
        identity.seedCustomer("Khoa", "male", TODAY.minusYears(22), CustomerStatus.LOCKED);
        seedLine(under18.id(), CONTROLLER, "Tay cầm");
        seedLine(young.id(), CONTROLLER, "Tay cầm");
        seedLine(adult.id(), DISC, "Đĩa game");

        SegmentResponse created = segments.create(ACTOR, "Tay cầm", Map.of(
                "preset", "category",
                "categoryId", CONTROLLER.toString()));

        assertThat(created.members()).extracting(SegmentMemberResponse::fullName)
                .containsExactly("Tre", "Tre Vua");
    }

    @Test
    void categoryPresetMatchesAnySelectedName() {
        CustomerView controller = identity.seedCustomer(
                "Cam", "male", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView disc = identity.seedCustomer(
                "Dia", "female", TODAY.minusYears(30), CustomerStatus.ACTIVE);
        seedLine(controller.id(), CONTROLLER, "Tay cầm");
        seedLine(disc.id(), DISC, "Đĩa game");

        SegmentResponse created = segments.create(ACTOR, "Hai danh mục", Map.of(
                "preset", "category",
                "categoryNames", List.of("Tay cầm", "Đĩa game")));

        assertThat(created.members()).extracting(SegmentMemberResponse::fullName)
                .containsExactly("Cam", "Dia");
    }

    @Test
    void severalPresetsMustAllMatch() {
        CustomerView both = identity.seedCustomer(
                "Ca hai", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView onlyAge = identity.seedCustomer(
                "Chi tuoi", "male", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView onlyCategory = identity.seedCustomer(
                "Chi danh muc", "female", TODAY.minusYears(40), CustomerStatus.ACTIVE);
        seedLine(both.id(), CONTROLLER, "Tay cầm");
        seedLine(onlyCategory.id(), CONTROLLER, "Tay cầm");

        SegmentResponse created = segments.create(ACTOR, "Tuổi và tay cầm", Map.of(
                "presets", List.of("age", "category"),
                "buckets", List.of("18–24"),
                "categoryNames", List.of("Tay cầm")));

        assertThat(created.members()).extracting(SegmentMemberResponse::fullName)
                .containsExactly("Ca hai");
    }

    @Test
    void rfmPresetGroupsByClassifier() {
        CustomerView lost = identity.seedCustomer(
                "Moi", "female", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        CustomerView potential = identity.seedCustomer(
                "Mot", "male", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        CustomerView locked = identity.seedCustomer(
                "Khoa", "male", TODAY.minusYears(22), CustomerStatus.LOCKED);
        seedDelivered(potential.id(), "200000", "2026-09-10T10:00:00Z");
        seedDelivered(locked.id(), "200000", "2026-09-10T10:00:00Z");

        SegmentResponse potentialSegment = segments.create(ACTOR, "Tiềm năng", Map.of(
                "preset", "rfm",
                "segment", RfmClassifier.POTENTIAL));
        SegmentResponse lostSegment = segments.create(ACTOR, "Ngủ đông", Map.of(
                "preset", "rfm",
                "segment", RfmClassifier.LOST));

        assertThat(potentialSegment.members()).extracting(SegmentMemberResponse::userId)
                .containsExactly(potential.id());
        assertThat(lostSegment.members()).extracting(SegmentMemberResponse::userId)
                .containsExactly(lost.id());
        assertThat(rfmOf(lost.id())).isEqualTo(RfmClassifier.LOST);
        assertThat(rfmOf(potential.id())).isEqualTo(RfmClassifier.POTENTIAL);
    }

    @Test
    void rfmDefaultsCoverEveryLabelAndKeepAnExistingOne() {
        identity.seedCustomer("Moi", "female", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        segments.create(ACTOR, "Loyal tay", Map.of(
                "preset", "rfm",
                "segment", RfmClassifier.LOYAL));

        segments.ensureRfmDefaults();
        segments.ensureRfmDefaults();

        assertThat(segments.list(ACTOR).segments())
                .extracting(SegmentResponse::name)
                .containsExactlyInAnyOrder("Loyal tay", "Champions", "Potential", "At Risk", "Lost", "Other");
    }

    @Test
    void rfmDefaultsCannotBeRenamedOrDeleted() {
        segments.ensureRfmDefaults();
        UUID champions = UUID.fromString("a1000001-0000-4000-8000-000000000001");

        assertThat(segments.get(ACTOR, champions).locked()).isTrue();
        assertThatThrownBy(() -> segments.update(ACTOR, champions, "Đổi tên", Map.of(
                "preset", "rfm",
                "segment", RfmClassifier.CHAMPIONS)))
                .isInstanceOf(SegmentLockedException.class);
        assertThatThrownBy(() -> segments.delete(ACTOR, champions))
                .isInstanceOf(SegmentLockedException.class);
        assertThat(segments.get(ACTOR, champions).name()).isEqualTo("Champions");
    }

    @Test
    void unknownPresetIsRejected() {
        assertThatThrownBy(() -> segments.create(ACTOR, "Sai", Map.of("preset", "voucher")))
                .isInstanceOf(InvalidSegmentRuleException.class)
                .hasMessageContaining("age");
    }

    private String rfmOf(UUID userId) {
        return new OrderCountRfmStub(orders, null, CLOCK).rfmSegment(userId);
    }

    private void seedDelivered(UUID userId, String amount, String deliveredAt) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal(amount),
                Instant.parse(deliveredAt),
                List.of(new DeliveredOrderLine(UUID.randomUUID(), DISC, "Đĩa game", new BigDecimal(amount)))));
    }

    private void seedLine(UUID userId, UUID categoryId, String categoryName) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(UUID.randomUUID(), categoryId, categoryName, BigDecimal.TEN))));
    }
}
