package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidCustomerStatusException;
import com.chototmua.crm.port.dto.CreateCustomerCommand;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Kiểm tra bản giả lập danh tính: quyền quản trị/CRM và vòng đời khách. */
class FakeIdentityPortTest {

    private FakeIdentityPort identity;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
    }

    @Test
    void adminCanLockAndUnlockCustomer() {
        UUID admin = identity.seedStaff(StaffDepartment.ADMIN);
        CustomerView customer = identity.seedCustomer(
                "Nguyen Van A", "male", LocalDate.of(1998, 5, 1), CustomerStatus.ACTIVE);

        identity.requireCustomerAdmin(admin);
        identity.lock(customer.id());
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.LOCKED);

        identity.unlock(customer.id());
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void crmManagerCanLockAndUnlockCustomer() {
        UUID crm = identity.seedStaff(StaffDepartment.CRM);
        CustomerView customer = identity.seedCustomer(
                "Tran Thi B", "female", LocalDate.of(2002, 1, 15), CustomerStatus.ACTIVE);

        identity.requireCustomerAdmin(crm);
        identity.lock(customer.id());
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.LOCKED);

        identity.unlock(customer.id());
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void customerServiceStaffIsRejectedFromLockUnlock() {
        UUID cs = identity.seedStaff(StaffDepartment.CS);

        assertThatThrownBy(() -> identity.requireCustomerAdmin(cs))
                .isInstanceOf(CrmForbiddenException.class)
                .hasMessageContaining("CRM");
    }

    @Test
    void salesStaffIsRejectedFromCustomerAdmin() {
        UUID sales = identity.seedStaff(StaffDepartment.SALES);

        assertThatThrownBy(() -> identity.requireCustomerAdmin(sales))
                .isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void requireCrmStaffAllowsAdminCrmAndCsButNotSales() {
        identity.requireCrmStaff(identity.seedStaff(StaffDepartment.ADMIN));
        identity.requireCrmStaff(identity.seedStaff(StaffDepartment.CRM));
        identity.requireCrmStaff(identity.seedStaff(StaffDepartment.CS));

        assertThatThrownBy(() -> identity.requireCrmStaff(identity.seedStaff(StaffDepartment.SALES)))
                .isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void findCustomersHidesDeletedByDefault() {
        identity.seedCustomer("Active", "male", LocalDate.of(1990, 1, 1), CustomerStatus.ACTIVE);
        CustomerView deleted = identity.seedCustomer(
                "Deleted", "female", LocalDate.of(1991, 1, 1), CustomerStatus.ACTIVE);
        identity.softDeleteCustomer(deleted.id());

        List<CustomerView> visible = identity.findCustomers(new CustomerFilter(null, null), false);
        assertThat(visible).extracting(CustomerView::fullName).containsExactly("Active");

        List<CustomerView> all = identity.findCustomers(new CustomerFilter(null, null), true);
        assertThat(all).extracting(CustomerView::fullName).containsExactly("Active", "Deleted");
    }

    @Test
    void cannotUnlockDeletedCustomer() {
        CustomerView customer = identity.seedCustomer(
                "Gone", "male", LocalDate.of(1988, 3, 3), CustomerStatus.ACTIVE);
        identity.softDeleteCustomer(customer.id());

        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.DELETED);
        assertThatThrownBy(() -> identity.unlock(customer.id()))
                .isInstanceOf(InvalidCustomerStatusException.class);
    }

    @Test
    void restoreCustomerReturnsActiveFromDeleted() {
        CustomerView customer = identity.seedCustomer(
                "Gone", "male", LocalDate.of(1988, 3, 3), CustomerStatus.ACTIVE);
        identity.softDeleteCustomer(customer.id());

        identity.restoreCustomer(customer.id());
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void restoreRejectsCustomerThatIsNotDeleted() {
        CustomerView customer = identity.seedCustomer(
                "Alive", "female", LocalDate.of(1995, 2, 2), CustomerStatus.ACTIVE);

        assertThatThrownBy(() -> identity.restoreCustomer(customer.id()))
                .isInstanceOf(InvalidCustomerStatusException.class);
    }

    @Test
    void onlyAdminMayRestore() {
        UUID admin = identity.seedStaff(StaffDepartment.ADMIN);
        UUID crm = identity.seedStaff(StaffDepartment.CRM);

        identity.requireAdmin(admin);
        assertThatThrownBy(() -> identity.requireAdmin(crm))
                .isInstanceOf(CrmForbiddenException.class)
                .hasMessageContaining("quản trị");
    }

    @Test
    void createCustomerStartsActiveWithDobAndGender() {
        CustomerView created = identity.createCustomer(new CreateCustomerCommand(
                "Le Van C",
                "c@example.com",
                "0900000000",
                "male",
                LocalDate.of(2000, 12, 12)));

        assertThat(created.status()).isEqualTo(CustomerStatus.ACTIVE);
        assertThat(created.dob()).isEqualTo(LocalDate.of(2000, 12, 12));
        assertThat(created.gender()).isEqualTo("male");
    }

    @Test
    void updateCustomerKeepsStatusAndChangesProfile() {
        CustomerView customer = identity.seedCustomer(
                "Old", "male", LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);

        CustomerView updated = identity.updateCustomer(customer.id(), new CreateCustomerCommand(
                "New Name",
                "new@example.com",
                "0912345678",
                "female",
                LocalDate.of(1991, 2, 2)));

        assertThat(updated.fullName()).isEqualTo("New Name");
        assertThat(updated.email()).isEqualTo("new@example.com");
        assertThat(updated.phone()).isEqualTo("0912345678");
        assertThat(updated.gender()).isEqualTo("female");
        assertThat(updated.dob()).isEqualTo(LocalDate.of(1991, 2, 2));
        assertThat(updated.status()).isEqualTo(CustomerStatus.LOCKED);
    }

    @Test
    void cannotUpdateDeletedCustomer() {
        CustomerView customer = identity.seedCustomer(
                "Gone", "male", LocalDate.of(1988, 3, 3), CustomerStatus.DELETED);

        assertThatThrownBy(() -> identity.updateCustomer(customer.id(), new CreateCustomerCommand(
                "Nope", "n@example.com", "0900000000", "male", LocalDate.of(1988, 3, 3))))
                .isInstanceOf(InvalidCustomerStatusException.class);
    }

    @Test
    void lockUnknownCustomerFails() {
        assertThatThrownBy(() -> identity.lock(UUID.randomUUID()))
                .isInstanceOf(CustomerNotFoundException.class);
    }
}
