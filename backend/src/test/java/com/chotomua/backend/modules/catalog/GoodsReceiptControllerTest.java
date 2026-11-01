package com.chotomua.backend.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

/** Segregation of duties on goods receipts: whoever drew a receipt up cannot approve or reject it. */
class GoodsReceiptControllerTest {

    private final GoodsReceiptRepository receipts = mock(GoodsReceiptRepository.class);
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final InventoryStockService inventory = mock(InventoryStockService.class);
    private final GoodsReceiptController controller = new GoodsReceiptController(receipts, employees,
            mock(WarehouseRepository.class), mock(ProductVariantRepository.class), inventory);

    private final UUID clerkUserId = UUID.randomUUID();
    private final UUID managerUserId = UUID.randomUUID();
    private Employee manager;
    private GoodsReceipt receipt;

    @BeforeEach
    void setUp() {
        Employee clerk = employee(clerkUserId, "Nhân viên kho", "warehouse");
        manager = employee(managerUserId, "Quản trị viên", "admin");
        Warehouse warehouse = mock(Warehouse.class);
        receipt = new GoodsReceipt("GR-1", clerk, warehouse, "NCC A");
        ReflectionTestUtils.setField(receipt, "id", UUID.randomUUID());
        when(receipts.findByIdForUpdate(receipt.getId())).thenReturn(Optional.of(receipt));
        when(receipts.save(any(GoodsReceipt.class))).thenAnswer(call -> call.getArgument(0));
    }

    private Employee employee(UUID userId, String name, String department) {
        User user = new User("u-" + userId, "x");
        user.setFullName(name);
        Employee employee = new Employee(user, department);
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        when(employees.findByUserId(userId)).thenReturn(Optional.of(employee));
        return employee;
    }

    private static UsernamePasswordAuthenticationToken as(UUID userId) {
        return new UsernamePasswordAuthenticationToken(userId.toString(), null);
    }

    @Test
    void theClerkWhoDrewItUpCannotApproveOrRejectIt() {
        assertThatThrownBy(() -> controller.approve(receipt.getId(), as(clerkUserId)))
                .hasMessageContaining("không được tự duyệt");
        assertThatThrownBy(() -> controller.reject(receipt.getId(), as(clerkUserId)))
                .hasMessageContaining("không được tự duyệt");
        verify(inventory, never()).importForReceipt(any(), any(), any());
        assertThat(receipt.getStatus()).isEqualTo("pending");
    }

    @Test
    void anotherEmployeeApprovesAndIsRecordedAsTheApprover() {
        var approved = controller.approve(receipt.getId(), as(managerUserId));

        assertThat(approved.status()).isEqualTo("approved");
        assertThat(approved.createdByName()).isEqualTo("Nhân viên kho");
        assertThat(approved.decidedByName()).isEqualTo("Quản trị viên");
        assertThat(approved.decidedAt()).isNotNull();
        assertThat(receipt.getDecidedBy()).isSameAs(manager);
    }
}
