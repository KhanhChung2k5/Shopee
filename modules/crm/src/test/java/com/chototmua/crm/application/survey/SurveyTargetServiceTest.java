package com.chototmua.crm.application.survey;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.InvalidSurveyException;
import com.chototmua.crm.application.exception.SurveyNotFoundException;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.SurveyProductTargetResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Lưu/đọc target khảo sát và resolve productIds ∪ bộ lọc. */
class SurveyTargetServiceTest {

    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SALES = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID CUSTOMER = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID CAT_PAD = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID ELDEN = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID DRAFT_PAD = UUID.fromString("02020202-0000-0000-0000-00000000aa");

    private FakeIdentityPort identity;
    private FakeProductPort products;
    private InMemorySurveyStore surveys;
    private InMemorySurveyTargetStore targets;
    private SurveyTargetService service;
    private UUID surveyId;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        products = new FakeProductPort();
        surveys = new InMemorySurveyStore();
        targets = new InMemorySurveyTargetStore();
        service = new SurveyTargetService(identity, products, surveys, targets);
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        identity.seedStaff(SALES, StaffDepartment.SALES);
        seedCatalog();
        surveyId = UUID.randomUUID();
        surveys.save(new Survey(surveyId, ADMIN, "Sau mua", null, Survey.DRAFT, Instant.parse("2026-10-01T00:00:00Z")), List.of());
    }

    @Test
    void savesAndReadsSpecificIdsAndFilter() {
        ProductFilter filter = new ProductFilter(null, "game_disc", null, null, null, null, null, true);
        SurveyProductTargetResponse saved = service.set(ADMIN, surveyId, List.of(DUALSENSE), filter);

        assertThat(saved.productIds()).containsExactly(DUALSENSE);
        assertThat(saved.filter().productType()).isEqualTo("game_disc");
        assertThat(saved.resolvedProductIds()).containsExactlyInAnyOrder(DUALSENSE, FIFA, ELDEN);

        SurveyProductTargetResponse loaded = service.get(ADMIN, surveyId);
        assertThat(loaded.productIds()).containsExactly(DUALSENSE);
        assertThat(loaded.filter().productType()).isEqualTo("game_disc");
        assertThat(loaded.resolvedProductIds()).containsExactlyInAnyOrder(DUALSENSE, FIFA, ELDEN);
    }

    @Test
    void resolveUnionsExplicitIdsWithFilterMatches() {
        service.set(ADMIN, surveyId, List.of(DUALSENSE),
                new ProductFilter(null, "game_disc", CAT_DISC, "Thể thao", "PS5", null, null, true));

        assertThat(service.resolveTargetProductIds(surveyId)).containsExactlyInAnyOrder(DUALSENSE, FIFA);
    }

    @Test
    void inactiveProductIsRejected() {
        assertThatThrownBy(() -> service.set(ADMIN, surveyId, List.of(DRAFT_PAD), null))
                .isInstanceOf(InvalidSurveyException.class)
                .hasMessageContaining("ngừng bán");
    }

    @Test
    void unknownSurveyIsNotFound() {
        assertThatThrownBy(() -> service.get(ADMIN, UUID.randomUUID()))
                .isInstanceOf(SurveyNotFoundException.class);
    }

    @Test
    void salesStaffIsForbidden() {
        assertThatThrownBy(() -> service.set(SALES, surveyId, List.of(DUALSENSE), null))
                .isInstanceOf(CrmForbiddenException.class);
        assertThatThrownBy(() -> service.get(SALES, surveyId))
                .isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void unknownActorTreatedAsForbidden() {
        assertThatThrownBy(() -> service.get(CUSTOMER, surveyId))
                .isInstanceOf(CrmForbiddenException.class);
    }

    private void seedCatalog() {
        products.seed(new ProductView(
                DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT_PAD, "Tay cầm", null, List.of("PS5"),
                new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5", "PS4"),
                new BigDecimal("990000"), "published"));
        products.seed(new ProductView(
                ELDEN, "Đĩa Elden Ring", "Bandai Namco", "game_disc",
                CAT_DISC, "Đĩa game", "Nhập vai", List.of("PS5"),
                new BigDecimal("1190000"), "published"));
        products.seed(new ProductView(
                DRAFT_PAD, "Tay cầm nháp", "OEM", "controller",
                CAT_PAD, "Tay cầm", null, List.of("PC"),
                new BigDecimal("199000"), "draft"));
    }
}
