package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.dto.RefundRequest;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

/** KAN-235: approving a refund must credit the buyer's wallet with exactly the right amount. */
class RefundServiceTest {

    private RefundReturnRepository refunds;
    private OrderItemRepository items;
    private OrderRepository orders;
    private EmployeeRepository employees;
    private UserRepository users;
    private WalletTransactionRepository transactions;
    private RefundService service;

    @BeforeEach
    void setUp() {
        refunds = mock(RefundReturnRepository.class);
        items = mock(OrderItemRepository.class);
        orders = mock(OrderRepository.class);
        employees = mock(EmployeeRepository.class);
        users = mock(UserRepository.class);
        transactions = mock(WalletTransactionRepository.class);
        service = new RefundService(refunds, items, orders, employees, users, transactions);
        when(refunds.save(any(RefundReturn.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactions.save(any(WalletTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void approve_creditsBuyerWalletWithLineTotalMinusItsShareOfTheOrderDiscount() {
        UUID buyerId = UUID.randomUUID();
        UUID csUserId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID refundId = UUID.randomUUID();

        // Order: subtotal 1,000,000 with a 100,000 discount (10%) applied across the whole invoice.
        Order order = new Order(buyerId, UUID.randomUUID(), "123 Lê Lợi",
                new BigDecimal("1000000"), new BigDecimal("100000"), BigDecimal.ZERO, new BigDecimal("900000"));
        setId(order, orderId);
        order.setStatus("delivered");

        // The refunded line is 400,000 of that 1,000,000 subtotal, so it carries 40,000 of the discount.
        OrderItem item = new OrderItem(orderId, UUID.randomUUID(), 1, new BigDecimal("400000"), "Tay cầm DualSense", null);
        setId(item, itemId);

        RefundReturn refund = new RefundReturn(itemId, "Sản phẩm bị lỗi khi nhận hàng");
        setId(refund, refundId);

        User buyer = new User("buyer", "hash");
        setId(buyer, buyerId);
        buyer.setWalletBalance(new BigDecimal("50000"));

        Employee csEmployee = new Employee(employeeUser(), "cs");
        setId(csEmployee, UUID.randomUUID());

        when(refunds.findById(refundId)).thenReturn(Optional.of(refund));
        when(items.findById(itemId)).thenReturn(Optional.of(item));
        when(orders.findById(orderId)).thenReturn(Optional.of(order));
        when(users.findByIdForUpdate(buyerId)).thenReturn(Optional.of(buyer));
        when(employees.findByUserId(csUserId)).thenReturn(Optional.of(csEmployee));

        RefundResponse response = service.approve(csUserId, refundId);

        // 400,000 - (100,000 * 400,000 / 1,000,000) = 400,000 - 40,000 = 360,000
        assertThat(response.refundAmount()).isEqualByComparingTo("360000");
        assertThat(response.status()).isEqualTo("refunded");
        assertThat(buyer.getWalletBalance()).isEqualByComparingTo("410000"); // 50,000 + 360,000
    }

    @Test
    void approve_rejectsWhenTheStaffMemberIsNeitherCsNorAdmin() {
        UUID refundId = UUID.randomUUID();
        UUID warehouseUserId = UUID.randomUUID();
        RefundReturn refund = new RefundReturn(UUID.randomUUID(), "Giao nhầm hàng");
        setId(refund, refundId);
        Employee warehouseEmployee = new Employee(employeeUser(), "warehouse");

        when(refunds.findById(refundId)).thenReturn(Optional.of(refund));
        when(employees.findByUserId(warehouseUserId)).thenReturn(Optional.of(warehouseEmployee));

        assertThatThrownBy(() -> service.approve(warehouseUserId, refundId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void approve_rejectsARefundThatWasAlreadyProcessed() {
        UUID refundId = UUID.randomUUID();
        RefundReturn refund = new RefundReturn(UUID.randomUUID(), "Đổi ý");
        setId(refund, refundId);
        refund.reject(UUID.randomUUID());
        when(refunds.findById(refundId)).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), refundId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Yêu cầu đã được xử lý");
    }

    @Test
    void request_rejectsARefundForAnOrderThatHasNotBeenDeliveredYet() {
        UUID buyerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Order order = new Order(buyerId, UUID.randomUUID(), "123 Lê Lợi",
                new BigDecimal("400000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("400000"));
        setId(order, orderId); // status defaults to "pending" — never confirmed/shipped/delivered
        OrderItem item = new OrderItem(orderId, UUID.randomUUID(), 1, new BigDecimal("400000"), "Tay cầm", null);
        setId(item, itemId);

        when(items.findById(itemId)).thenReturn(Optional.of(item));
        when(orders.findByIdAndUserId(orderId, buyerId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.request(buyerId, new RefundRequest(itemId, "Chưa nhận được hàng")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Chỉ có thể yêu cầu hoàn tiền sau khi đơn đã giao");
    }

    @Test
    void request_rejectsADuplicateRequestForTheSameLineWhileOneIsAlreadyPending() {
        UUID buyerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Order order = new Order(buyerId, UUID.randomUUID(), "123 Lê Lợi",
                new BigDecimal("400000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("400000"));
        setId(order, orderId);
        order.setStatus("delivered");
        OrderItem item = new OrderItem(orderId, UUID.randomUUID(), 1, new BigDecimal("400000"), "Tay cầm", null);
        setId(item, itemId);
        RefundReturn existing = new RefundReturn(itemId, "Yêu cầu trước đó");

        when(items.findById(itemId)).thenReturn(Optional.of(item));
        when(orders.findByIdAndUserId(orderId, buyerId)).thenReturn(Optional.of(order));
        when(refunds.findByOrderItemId(itemId)).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.request(buyerId, new RefundRequest(itemId, "Muốn hoàn tiền lần nữa")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Dòng hàng đã có yêu cầu hoàn tiền");
    }

    private static User employeeUser() {
        User user = new User("staff", "hash");
        setId(user, UUID.randomUUID());
        return user;
    }

    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException exception) {
            throw new RuntimeException(exception);
        }
    }
}
