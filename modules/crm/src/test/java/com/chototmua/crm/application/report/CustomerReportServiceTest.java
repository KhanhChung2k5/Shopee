package com.chototmua.crm.application.report;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.CustomerReportResponse;
import com.chototmua.crm.web.dto.InterestBucket;
import com.chototmua.crm.web.dto.ReportBucket;
import com.chototmua.crm.web.dto.ReportCustomer;
import com.chototmua.crm.web.dto.ReportFact;
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

/**
 * Công thức nhóm tuổi / giới tính / sở thích trên cổng giả — không JDBC, không fact_*.
 */
class CustomerReportServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 23);
    private static final Clock CLOCK = Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private static final UUID ACTOR = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private CustomerReportService reports;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        reports = new CustomerReportService(identity, orders, CLOCK);
        identity.seedStaff(ACTOR, StaffDepartment.ADMIN);
    }

    @Test
    void threeCustomersProduceExpectedAgePercents() {
        CustomerView under18 = identity.seedCustomer(
                "Tre", "male", TODAY.minusYears(10), CustomerStatus.ACTIVE);
        CustomerView young = identity.seedCustomer(
                "Tre Vua", "female", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView adult = identity.seedCustomer(
                "Trung", null, TODAY.minusYears(30), CustomerStatus.ACTIVE);

        seedLine(under18.id(), CONTROLLER, "Tay cầm");
        seedLine(young.id(), CONTROLLER, "Tay cầm");
        seedLine(adult.id(), DISC, "Đĩa game");

        CustomerReportResponse report = reports.build(ACTOR);

        assertThat(report.totalCustomers()).isEqualTo(3);
        assertCountAndPercent(bucket(report.age(), "UNDER_18"), 1, "33.33");
        assertCountAndPercent(bucket(report.age(), "18–24"), 1, "33.33");
        assertCountAndPercent(bucket(report.age(), "25–34"), 1, "33.33");
        assertThat(bucket(report.age(), "35–44").count()).isZero();
        assertThat(bucket(report.age(), "45+").count()).isZero();
        assertThat(report.interests())
                .extracting(InterestBucket::categoryName)
                .containsExactly("Tay cầm", "Đĩa game");
        assertThat(report.interests().get(0).percent()).isEqualByComparingTo("66.67");
        assertThat(report.interests().get(1).percent()).isEqualByComparingTo("33.33");
    }

    @Test
    void genreChartCountsGameDiscsOnly() {
        CustomerView sportsFan = identity.seedCustomer(
                "Fan The Thao", "male", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        CustomerView actionFan = identity.seedCustomer(
                "Fan Hanh Dong", "female", TODAY.minusYears(28), CustomerStatus.ACTIVE);

        seedGenre(sportsFan.id(), "Thể thao");
        seedGenre(sportsFan.id(), "Thể thao");
        seedGenre(actionFan.id(), "Hành động");
        seedLine(actionFan.id(), CONTROLLER, "Tay cầm");

        CustomerReportResponse report = reports.build(ACTOR);

        assertThat(report.genres())
                .extracting(ReportBucket::label)
                .containsExactly("Thể thao", "Hành động");
        assertThat(report.genres().get(0).count()).isEqualTo(2);
        assertThat(report.genres().get(0).percent()).isEqualByComparingTo("66.67");
        assertThat(report.genres().get(1).percent()).isEqualByComparingTo("33.33");
        assertThat(report.interests()).extracting(InterestBucket::categoryName)
                .containsExactly("Đĩa game", "Tay cầm");
    }

    @Test
    void factsKeepCustomerDemographicsOnEachOrderLine() {
        CustomerView buyer = identity.seedCustomer(
                "Mua", "male", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        CustomerView quiet = identity.seedCustomer(
                "Chua Mua", "female", TODAY.minusYears(40), CustomerStatus.ACTIVE);
        seedGenre(buyer.id(), "Hành động");
        seedLine(buyer.id(), CONTROLLER, "Tay cầm");

        CustomerReportResponse report = reports.build(ACTOR);

        assertThat(report.facts())
                .filteredOn(fact -> buyer.id().equals(fact.customerId()))
                .hasSize(2)
                .allSatisfy(fact -> {
                    assertThat(fact.age()).isEqualTo("18–24");
                    assertThat(fact.gender()).isEqualTo("male");
                });
        assertThat(report.facts())
                .filteredOn(fact -> quiet.id().equals(fact.customerId()))
                .singleElement()
                .extracting(ReportFact::categoryName, ReportFact::genre)
                .containsExactly(null, null);
    }

    @Test
    void missingGenderGoesToUnknownBucket() {
        identity.seedCustomer("Nam", "male", TODAY.minusYears(22), CustomerStatus.ACTIVE);
        identity.seedCustomer("Nu", "female", TODAY.minusYears(22), CustomerStatus.LOCKED);
        identity.seedCustomer("Khong Ro", "  ", TODAY.minusYears(22), CustomerStatus.ACTIVE);

        CustomerReportResponse report = reports.build(ACTOR);

        assertCountAndPercent(bucket(report.gender(), "male"), 1, "33.33");
        assertCountAndPercent(bucket(report.gender(), "female"), 1, "33.33");
        assertCountAndPercent(bucket(report.gender(), "unknown"), 1, "33.33");
    }

    @Test
    void deletedCustomersAreExcludedFromReport() {
        identity.seedCustomer("Con", "male", TODAY.minusYears(20), CustomerStatus.ACTIVE);
        identity.seedCustomer("Xoa", "female", TODAY.minusYears(16), CustomerStatus.DELETED);

        CustomerReportResponse report = reports.build(ACTOR);

        assertThat(report.totalCustomers()).isEqualTo(1);
        assertThat(bucket(report.age(), "18–24").count()).isEqualTo(1);
        assertThat(bucket(report.age(), "UNDER_18").count()).isZero();
        assertThat(bucket(report.gender(), "female").count()).isZero();
    }

    @Test
    void customersExposeLtvAndRfmSortedByLifetimeValue() {
        CustomerView quiet = identity.seedCustomer(
                "Im Lang", "male", TODAY.minusYears(30), CustomerStatus.ACTIVE);
        CustomerView buyer = identity.seedCustomer(
                "Mua Nhieu", "female", TODAY.minusYears(28), CustomerStatus.ACTIVE);
        seedLine(buyer.id(), CONTROLLER, "Tay cầm");

        CustomerReportResponse report = reports.build(ACTOR);

        assertThat(report.customers())
                .extracting(ReportCustomer::fullName)
                .containsExactly("Mua Nhieu", "Im Lang");
        ReportCustomer valued = report.customers().get(0);
        assertThat(valued.customerId()).isEqualTo(buyer.id());
        assertThat(valued.ltv()).isEqualByComparingTo("10");
        assertThat(valued.totalOrders()).isEqualTo(1);
        assertThat(valued.rfmSegment()).isEqualTo(RfmClassifier.POTENTIAL);
        ReportCustomer idle = report.customers().get(1);
        assertThat(idle.customerId()).isEqualTo(quiet.id());
        assertThat(idle.ltv()).isEqualByComparingTo("0");
        assertThat(idle.totalOrders()).isZero();
        assertThat(idle.rfmSegment()).isEqualTo(RfmClassifier.LOST);
    }

    @Test
    void missingDobGoesToUnknownAgeBucket() {
        identity.seedCustomer("Thieu Ngay Sinh", "male", null, CustomerStatus.ACTIVE);

        CustomerReportResponse report = reports.build(ACTOR);

        assertCountAndPercent(bucket(report.age(), "UNKNOWN"), 1, "100.00");
    }

    @Test
    void serviceOnlyDependsOnIdentityAndOrderPorts() {
        assertThat(CustomerReportService.class.getDeclaredFields())
                .extracting(field -> field.getType().getName())
                .doesNotContain("javax.sql.DataSource", "java.sql.Connection")
                .noneMatch(name -> name.toLowerCase().contains("clickhouse"))
                .noneMatch(name -> name.toLowerCase().contains("jdbc"))
                .noneMatch(name -> name.toLowerCase().contains("fact_"));
    }

    @Test
    void ageBoundariesMatchSpecBuckets() {
        assertThat(AgeBucket.fromDob(TODAY.minusYears(17), TODAY)).isEqualTo(AgeBucket.UNDER_18);
        assertThat(AgeBucket.fromDob(TODAY.minusYears(18), TODAY)).isEqualTo(AgeBucket.FROM_18_TO_24);
        assertThat(AgeBucket.fromDob(TODAY.minusYears(24), TODAY)).isEqualTo(AgeBucket.FROM_18_TO_24);
        assertThat(AgeBucket.fromDob(TODAY.minusYears(25), TODAY)).isEqualTo(AgeBucket.FROM_25_TO_34);
        assertThat(AgeBucket.fromDob(TODAY.minusYears(35), TODAY)).isEqualTo(AgeBucket.FROM_35_TO_44);
        assertThat(AgeBucket.fromDob(TODAY.minusYears(45), TODAY)).isEqualTo(AgeBucket.FROM_45);
        assertThat(AgeBucket.fromDob(null, TODAY)).isEqualTo(AgeBucket.UNKNOWN);
    }

    private void seedGenre(UUID userId, String genre) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        UUID.randomUUID(), DISC, "Đĩa game", BigDecimal.TEN, genre))));
    }

    private void seedLine(UUID userId, UUID categoryId, String categoryName) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(UUID.randomUUID(), categoryId, categoryName, BigDecimal.TEN))));
    }

    private static ReportBucket bucket(List<ReportBucket> buckets, String code) {
        return buckets.stream()
                .filter(item -> code.equals(item.bucket()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Thiếu bucket " + code));
    }

    private static void assertCountAndPercent(ReportBucket bucket, long count, String percent) {
        assertThat(bucket.count()).isEqualTo(count);
        assertThat(bucket.percent()).isEqualByComparingTo(percent);
    }
}
