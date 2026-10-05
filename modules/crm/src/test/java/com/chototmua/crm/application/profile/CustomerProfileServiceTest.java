package com.chototmua.crm.application.profile;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.segment.OrderCountRfmStub;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.CustomerProfileResponse;
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

/**
 * Tính lại ltv / totalOrders / rfm từ đơn {@code delivered}. Không xóa hồ sơ khi khóa hoặc xóa mềm.
 */
class CustomerProfileServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-23T08:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final UUID ACTOR = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SALES = UUID.fromString("55555555-5555-5555-5555-555555555555");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private InMemoryProfileStore store;
    private CustomerProfileService profiles;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        store = new InMemoryProfileStore();
        profiles = new CustomerProfileService(identity, orders, store, CLOCK);
        identity.seedStaff(ACTOR, StaffDepartment.ADMIN);
        identity.seedStaff(SALES, StaffDepartment.SALES);
    }

    @Test
    void noDeliveredOrdersStayAtZero() {
        CustomerView customer = identity.seedCustomer(
                "Moi", "female", LocalDate.of(2000, 1, 1), CustomerStatus.ACTIVE);
        orders.seedOrder(customer.id(), UUID.randomUUID());

        CustomerProfileResponse profile = profiles.recalculate(ACTOR, customer.id());

        assertThat(profile.totalOrders()).isZero();
        assertThat(profile.ltv()).isEqualByComparingTo("0");
        assertThat(profile.rfmSegment()).isEqualTo(RfmClassifier.LOST);
        assertThat(profile.lastPurchaseAt()).isNull();
        assertThat(profile.calculatedAt()).isEqualTo(NOW);
    }

    @Test
    void twoDeliveredOrdersSumLtvAndKeepTheSameRfmLabel() {
        CustomerView customer = identity.seedCustomer(
                "Hai", "male", LocalDate.of(1995, 4, 4), CustomerStatus.ACTIVE);
        seedDelivered(customer.id(), "150000", "2026-08-01T10:00:00Z");
        seedDelivered(customer.id(), "100000", "2026-08-20T10:00:00Z");

        CustomerProfileResponse first = profiles.recalculate(ACTOR, customer.id());
        CustomerProfileResponse second = profiles.recalculate(ACTOR, customer.id());

        assertThat(first.totalOrders()).isEqualTo(2);
        assertThat(first.ltv()).isEqualByComparingTo("13013.70");
        assertThat(first.rfmSegment()).isEqualTo(RfmClassifier.POTENTIAL);
        assertThat(first.lastPurchaseAt()).isEqualTo(Instant.parse("2026-08-20T10:00:00Z"));
        assertThat(second.rfmSegment()).isEqualTo(first.rfmSegment());
        assertThat(second.ltv()).isEqualByComparingTo(first.ltv());
        assertThat(second.totalOrders()).isEqualTo(first.totalOrders());
    }

    @Test
    void lockedAndDeletedCustomersKeepTheirProfile() {
        CustomerView locked = identity.seedCustomer(
                "Khoa", "male", LocalDate.of(1990, 2, 2), CustomerStatus.ACTIVE);
        CustomerView deleted = identity.seedCustomer(
                "Xoa", "female", LocalDate.of(1988, 3, 3), CustomerStatus.ACTIVE);
        seedDelivered(locked.id(), "80000", "2026-07-01T10:00:00Z");
        seedDelivered(deleted.id(), "120000", "2026-07-02T10:00:00Z");

        profiles.recalculate(locked.id());
        profiles.recalculate(deleted.id());
        identity.lock(locked.id());
        identity.softDeleteCustomer(deleted.id());

        CustomerProfileResponse lockedProfile = profiles.get(ACTOR, locked.id());
        CustomerProfileResponse deletedProfile = profiles.get(ACTOR, deleted.id());

        assertThat(lockedProfile.status()).isEqualTo(CustomerStatus.LOCKED);
        assertThat(lockedProfile.totalOrders()).isEqualTo(1);
        assertThat(lockedProfile.ltv()).isEqualByComparingTo("80000");
        assertThat(lockedProfile.rfmSegment()).isEqualTo(RfmClassifier.POTENTIAL);
        assertThat(deletedProfile.status()).isEqualTo(CustomerStatus.DELETED);
        assertThat(deletedProfile.totalOrders()).isEqualTo(1);
        assertThat(deletedProfile.ltv()).isEqualByComparingTo("120000");
        assertThat(store.find(locked.id())).isPresent();
        assertThat(store.find(deleted.id())).isPresent();
    }

    @Test
    void segmentSourceReadsTheStoredLabel() {
        CustomerView customer = identity.seedCustomer(
                "Luu", "female", LocalDate.of(1999, 9, 9), CustomerStatus.ACTIVE);
        store.save(new CustomerProfileCRM(
                customer.id(),
                new BigDecimal("10"),
                2,
                RfmClassifier.LOYAL,
                null,
                NOW));

        String label = new OrderCountRfmStub(orders, store).rfmSegment(customer.id());

        assertThat(label).isEqualTo(RfmClassifier.LOYAL);
    }

    @Test
    void salesStaffCannotRecalculate() {
        CustomerView customer = identity.seedCustomer(
                "An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);

        assertThatThrownBy(() -> profiles.recalculate(SALES, customer.id()))
                .isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void missingCustomerIsNotFound() {
        UUID missing = UUID.randomUUID();

        assertThatThrownBy(() -> profiles.recalculate(ACTOR, missing))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    private void seedDelivered(UUID userId, String amount, String deliveredAt) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal(amount),
                Instant.parse(deliveredAt),
                List.of(new DeliveredOrderLine(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Đĩa game",
                        new BigDecimal(amount)))));
    }
}
