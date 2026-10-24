package com.chotomua.backend.modules.order;

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
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.LoyaltyAwardService;
import com.chotomua.backend.modules.order.dto.RefundReturnRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

/** Manual bank refunds: returns of delivered lines (CS reviews) and paid orders that got cancelled. */
class RefundServiceTest {

    private final RefundReturnRepository refunds = mock(RefundReturnRepository.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderItemRepository items = mock(OrderItemRepository.class);
    private final OrderStatusHistoryRepository history = mock(OrderStatusHistoryRepository.class);
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final LoyaltyAwardService loyalty = mock(LoyaltyAwardService.class);
    private final RefundService service = new RefundService(refunds, orders, items, history, employees, users,
            new CheckoutPaymentService(paymentRepository), loyalty);

    private final UUID buyerId = UUID.randomUUID();
    private final UUID csUserId = UUID.randomUUID();
    private final List<RefundReturn> stored = new ArrayList<>();
    private Order order;
    private OrderItem controller;
    private Payment payment;

    @BeforeEach
    void setUp() {
        // 2 lines: 1.000.000 + 500.000 = 1.500.000, minus 150.000 discount → paid 1.350.000
        order = new Order(buyerId, UUID.randomUUID(), "addr", new BigDecimal("1500000"), new BigDecimal("150000"),
                BigDecimal.ZERO, new BigDecimal("1350000"));
        ReflectionTestUtils.setField(order, "id", UUID.randomUUID());
        order.setStatus("delivered");
        controller = new OrderItem(order.getId(), UUID.randomUUID(), 1, new BigDecimal("1000000"), "Tay cầm DualSense", null);
        ReflectionTestUtils.setField(controller, "id", UUID.randomUUID());
        when(items.findById(controller.getId())).thenReturn(Optional.of(controller));
        when(orders.findByIdAndUserId(order.getId(), buyerId)).thenReturn(Optional.of(order));
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));
        deliveredDaysAgo(2);

        when(refunds.save(any(RefundReturn.class))).thenAnswer(call -> {
            RefundReturn refund = call.getArgument(0);
            if (refund.getId() == null) ReflectionTestUtils.setField(refund, "id", UUID.randomUUID());
            stored.add(refund);
            return refund;
        });
        when(refunds.findByOrderItemId(any())).thenAnswer(call -> stored.stream()
                .filter(r -> call.getArgument(0).equals(r.getOrderItemId())).toList());
        when(refunds.findByOrderIdOrderByRequestedAtAsc(any())).thenAnswer(call -> stored.stream()
                .filter(r -> call.getArgument(0).equals(r.getOrderId())).toList());
        when(refunds.findById(any())).thenAnswer(call -> stored.stream()
                .filter(r -> call.getArgument(0).equals(r.getId())).findFirst());

        User staff = new User("cs", "x");
        Employee cs = new Employee(staff, "cs");
        ReflectionTestUtils.setField(cs, "id", UUID.randomUUID());
        when(employees.findByUserId(csUserId)).thenReturn(Optional.of(cs));

        payment = Payment.checkout(order.getId(), "cod", new BigDecimal("1350000"));
        payment.markPaid();
        when(paymentRepository.findByOrderIdAndPurpose(order.getId(), "checkout")).thenReturn(List.of(payment));
    }

    private void deliveredDaysAgo(int days) {
        OrderStatusHistory delivered = new OrderStatusHistory(order.getId(), "delivered", UUID.randomUUID(), "employee", null);
        ReflectionTestUtils.setField(delivered, "changedAt", OffsetDateTime.now().minusDays(days));
        when(history.findByOrderIdOrderByChangedAtAsc(order.getId())).thenReturn(List.of(delivered));
    }

    private RefundReturnRequest returnRequest() {
        return new RefundReturnRequest(controller.getId(), "Tay cầm bị drift", "Vietcombank", "0123456789", "NGUYEN VAN A");
    }

    @Test
    void returnIsRefundedAtWhatTheBuyerActuallyPaidForTheLine() {
        var created = service.requestReturn(buyerId, returnRequest());

        // 1.000.000 minus its share (2/3) of the 150.000 discount
        assertThat(created.refundAmount()).isEqualByComparingTo("900000");
        assertThat(created.status()).isEqualTo("requested");
        assertThat(created.productName()).isEqualTo("Tay cầm DualSense");

        assertThatThrownBy(() -> service.requestReturn(buyerId, returnRequest()))
                .hasMessageContaining("đã có yêu cầu hoàn tiền");
    }

    @Test
    void returnsAreOnlyForDeliveredOrdersWithinTheWindow() {
        deliveredDaysAgo(8);
        assertThatThrownBy(() -> service.requestReturn(buyerId, returnRequest())).hasMessageContaining("7 ngày");

        order.setStatus("shipping");
        assertThatThrownBy(() -> service.requestReturn(buyerId, returnRequest())).hasMessageContaining("sau khi đơn đã giao");
    }

    @Test
    void csApprovesThenRecordsTheTransferBackAndPointsAreTakenBack() {
        UUID id = service.requestReturn(buyerId, returnRequest()).id();

        assertThatThrownBy(() -> service.markRefunded(csUserId, id, "FT123"))
                .hasMessageContaining("đã duyệt");
        service.approve(csUserId, id);
        assertThatThrownBy(() -> service.markRefunded(csUserId, id, " "))
                .hasMessageContaining("mã giao dịch");

        var done = service.markRefunded(csUserId, id, "FT24300123");

        assertThat(done.status()).isEqualTo("refunded");
        assertThat(done.transferRef()).isEqualTo("FT24300123");
        assertThat(payment.getStatus()).isEqualTo("partially_refunded"); // 900.000 of 1.350.000
        verify(loyalty).revoke(order, new BigDecimal("900000"));
    }

    @Test
    void rejectedReturnNeedsAReasonAndCanBeAskedForAgain() {
        UUID id = service.requestReturn(buyerId, returnRequest()).id();
        assertThatThrownBy(() -> service.reject(csUserId, id, "")).hasMessageContaining("lý do");

        var rejected = service.reject(csUserId, id, "Sản phẩm đã qua sử dụng, không đủ điều kiện");

        assertThat(rejected.status()).isEqualTo("rejected");
        assertThat(service.requestReturn(buyerId, returnRequest()).status()).isEqualTo("requested");
    }

    @Test
    void cancelledPaidOrderIsOwedInFullAndCannotBeRejected() {
        order.setStatus("cancelled");
        service.openForCancelledOrder(order, new BigDecimal("1350000"), "Hết hàng");
        service.openForCancelledOrder(order, new BigDecimal("1350000"), "Hết hàng"); // only once
        assertThat(stored).hasSize(1);
        RefundReturn refund = stored.getFirst();
        assertThat(refund.getStatus()).isEqualTo("approved");

        assertThatThrownBy(() -> service.reject(csUserId, refund.getId(), "x")).hasMessageContaining("đã được xử lý");
        assertThatThrownBy(() -> service.markRefunded(csUserId, refund.getId(), "FT1"))
                .hasMessageContaining("tài khoản ngân hàng");

        service.updateBankAccount(buyerId, refund.getId(),
                new com.chotomua.backend.modules.order.dto.RefundBankAccountRequest("MB Bank", "99887766", "NGUYEN VAN A"));
        service.markRefunded(csUserId, refund.getId(), "FT999");

        assertThat(payment.getStatus()).isEqualTo("refunded");
        verify(loyalty, never()).revoke(any(), any()); // nothing was ever awarded for an undelivered order
    }

    @Test
    void onlyCsOrAdminHandleRefunds() {
        UUID salesUserId = UUID.randomUUID();
        Employee sales = new Employee(new User("sales", "x"), "sales");
        when(employees.findByUserId(salesUserId)).thenReturn(Optional.of(sales));
        UUID id = service.requestReturn(buyerId, returnRequest()).id();

        assertThatThrownBy(() -> service.approve(salesUserId, id)).isInstanceOf(AccessDeniedException.class);
    }
}
