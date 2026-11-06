package com.chotomua.backend.modules.crm.application.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.application.exception.InvalidCustomerStatusException;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** A customer with an order still on its way or money still owed back cannot be locked or deleted. */
class CustomerAccountServiceTest {

    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final FakeIdentityPort identity = new FakeIdentityPort();
    private final OrderPort orders = mock(OrderPort.class);
    private final CustomerAccountService service = new CustomerAccountService(identity, orders);
    private CustomerView customer;

    @BeforeEach
    void setUp() {
        identity.seedStaff(ADMIN, StaffDepartment.CS);
        customer = identity.seedCustomer("Cong Khanh", "male", LocalDate.of(1999, 1, 1), CustomerStatus.ACTIVE);
    }

    @Test
    void openOrdersOrRefundsBlockLockAndDelete() {
        when(orders.openWork(customer.id())).thenReturn(new OrderPort.OpenWork(1, 1));

        assertThatThrownBy(() -> service.lock(ADMIN, customer.id()))
                .isInstanceOf(InvalidCustomerStatusException.class)
                .hasMessageContaining("1 đơn chưa hoàn tất và 1 yêu cầu hoàn tiền");
        assertThatThrownBy(() -> service.softDelete(ADMIN, customer.id()))
                .isInstanceOf(InvalidCustomerStatusException.class);
        assertThat(identity.getCustomer(customer.id()).status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void customerWithNothingPendingCanBeLocked() {
        when(orders.openWork(customer.id())).thenReturn(new OrderPort.OpenWork(0, 0));

        assertThat(service.lock(ADMIN, customer.id()).status()).isEqualTo(CustomerStatus.LOCKED);
    }
}
