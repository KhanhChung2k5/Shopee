package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chotomua.backend.common.web.GlobalExceptionHandler;
import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.LoyaltyAwardService;
import com.chotomua.backend.modules.marketing.LoyaltyTransaction;
import com.chotomua.backend.modules.marketing.LoyaltyTransactionRepository;
import com.chotomua.backend.modules.marketing.VoucherQuoteService;
import com.chotomua.backend.modules.marketing.VoucherUsageRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * KAN-284: a COD checkout records a pending payment, and walking the order to delivered collects it
 * and awards loyalty points exactly once. (Refunds and the wallet were dropped from the system.)
 * Repository answers keep state in memory; no shared database is touched.
 */
class OrderCodPaymentIntegrationFlowTest {

    @Test
    void codCheckoutIsCollectedOnDeliveryAndAwardsLoyaltyOnce() throws Exception {
        UUID buyerId = UUID.randomUUID();
        UUID salesUserId = UUID.randomUUID();
        UUID warehouseUserId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();

        CartItemRepository cartItemRepository = mock(CartItemRepository.class);
        OrderRepository orderRepository = mock(OrderRepository.class);
        OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
        OrderStatusHistoryRepository historyRepository = mock(OrderStatusHistoryRepository.class);
        AddressRepository addressRepository = mock(AddressRepository.class);
        EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        ProductVariantLookup productVariantLookup = mock(ProductVariantLookup.class);
        WarehouseLookup warehouseLookup = mock(WarehouseLookup.class);
        VoucherQuoteService voucherQuoteService = mock(VoucherQuoteService.class);
        VoucherUsageRepository voucherUsageRepository = mock(VoucherUsageRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        PaymentRepository paymentRepository = mock(PaymentRepository.class);
        LoyaltyTransactionRepository loyaltyTransactionRepository = mock(LoyaltyTransactionRepository.class);

        User buyer = new User("buyer", "hash");
        setId(buyer, buyerId);
        when(userRepository.findByIdForUpdate(buyerId)).thenReturn(Optional.of(buyer));
        List<Payment> storedPayments = new ArrayList<>();
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            storedPayments.add(invocation.getArgument(0));
            return invocation.getArgument(0);
        });
        when(paymentRepository.findByOrderIdAndPurpose(any(UUID.class), any(String.class))).thenAnswer(invocation -> storedPayments);

        CheckoutPaymentService checkoutPaymentService = new CheckoutPaymentService(paymentRepository);
        LoyaltyAwardService loyaltyAwardService = new LoyaltyAwardService(userRepository, loyaltyTransactionRepository);

        AtomicReference<Order> storedOrder = new AtomicReference<>();
        List<OrderItem> storedItems = new ArrayList<>();
        List<OrderStatusHistory> storedHistory = new ArrayList<>();

        CartItem cartItem = new CartItem(buyerId, variantId, 1);
        when(addressRepository.findById(addressId)).thenReturn(Optional.of(ownedAddress(buyerId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(buyerId)).thenReturn(List.of(cartItem));
        when(productVariantLookup.findActiveById(variantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(variantId, new BigDecimal("500000"), "Tay cầm DualSense", "{\"color\":\"black\"}")));

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) setId(order, UUID.randomUUID());
            storedOrder.set(order);
            return order;
        });
        when(orderRepository.findById(any(UUID.class))).thenAnswer(invocation ->
                matchStoredOrder(storedOrder, invocation.getArgument(0)));
        when(orderRepository.findByIdAndUserId(any(UUID.class), any(UUID.class))).thenAnswer(invocation -> {
            UUID requestedId = invocation.getArgument(0);
            UUID requestedUserId = invocation.getArgument(1);
            Order order = storedOrder.get();
            return order != null && requestedId.equals(order.getId()) && requestedUserId.equals(order.getUserId())
                    ? Optional.of(order) : Optional.empty();
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> {
            List<OrderItem> newItems = invocation.getArgument(0);
            newItems.forEach(item -> { if (item.getId() == null) setId(item, UUID.randomUUID()); });
            storedItems.addAll(newItems);
            return newItems;
        });
        when(orderItemRepository.findById(any(UUID.class))).thenAnswer(invocation -> storedItems.stream()
                .filter(item -> invocation.getArgument(0).equals(item.getId())).findFirst());
        when(historyRepository.save(any(OrderStatusHistory.class))).thenAnswer(invocation -> {
            OrderStatusHistory history = invocation.getArgument(0);
            if (history.getId() == null) setId(history, UUID.randomUUID());
            storedHistory.add(history);
            return history;
        });

        Employee salesEmployee = new Employee(staffUser(), "sales");
        setId(salesEmployee, UUID.randomUUID());
        when(employeeRepository.findByUserId(salesUserId)).thenReturn(Optional.of(salesEmployee));
        Employee warehouseEmployee = new Employee(staffUser(), "warehouse");
        setId(warehouseEmployee, UUID.randomUUID());
        when(employeeRepository.findByUserId(warehouseUserId)).thenReturn(Optional.of(warehouseEmployee));
        when(warehouseLookup.existsById(any(UUID.class))).thenReturn(true);

        OrderService orderService = new OrderService(cartItemRepository, orderRepository, orderItemRepository,
                historyRepository, addressRepository, employeeRepository, productVariantLookup, warehouseLookup,
                voucherQuoteService, voucherUsageRepository, checkoutPaymentService, loyaltyAwardService, null);

        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new OrderController(orderService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        Authentication buyerAuth = authentication(buyerId, "ROLE_BUYER");
        Authentication salesAuth = authentication(salesUserId, "ROLE_STAFF");
        Authentication warehouseAuth = authentication(warehouseUserId, "ROLE_STAFF");

        // 1) Checkout with cash on delivery — nothing is collected yet.
        mvc.perform(post("/orders")
                        .principal(buyerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"addressId\":\"" + addressId + "\",\"paymentMethod\":\"cod\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(500000.0));

        assertThat(storedPayments).singleElement().satisfies(payment -> {
            assertThat(payment.getMethod()).isEqualTo("cod");
            assertThat(payment.getStatus()).isEqualTo("pending");
        });

        UUID orderId = storedOrder.get().getId();

        // 2) Walk the order to delivered — this awards loyalty points exactly once.
        mvc.perform(patch("/orders/{id}/status", orderId).principal(salesAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"confirmed\"}"))
                .andExpect(status().isOk());
        when(orderItemRepository.findByOrderId(orderId)).thenReturn(storedItems);
        mvc.perform(patch("/orders/{id}/shipping-info", orderId).principal(warehouseAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"warehouseId\":\"" + UUID.randomUUID() + "\",\"shippingProviderName\":\"Giao Hàng Nhanh\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/orders/{id}/tracking", orderId).principal(warehouseAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trackingNo\":\"GHN-284\",\"shipmentStatus\":\"shipping\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/orders/{id}/tracking", orderId).principal(warehouseAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trackingNo\":\"GHN-284\",\"shipmentStatus\":\"delivered\"}"))
                .andExpect(status().isOk());

        // 3) Delivered: the cash is collected and loyalty is credited exactly once (500,000đ → 50 points).
        assertThat(storedOrder.get().getStatus()).isEqualTo("delivered");
        assertThat(storedPayments.getFirst().getStatus()).isEqualTo("paid");
        assertThat(buyer.getLoyaltyBalance()).isEqualTo(50);
        verify(loyaltyTransactionRepository, times(1)).save(any(LoyaltyTransaction.class));
    }

    private static Optional<Order> matchStoredOrder(AtomicReference<Order> storedOrder, UUID requestedId) {
        Order order = storedOrder.get();
        return order != null && requestedId.equals(order.getId()) ? Optional.of(order) : Optional.empty();
    }

    private static Authentication authentication(UUID userId, String role) {
        return new UsernamePasswordAuthenticationToken(userId.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }

    private static Address ownedAddress(UUID userId, UUID addressId) {
        User user = new User("buyer", "hash");
        setId(user, userId);
        Address address = new Address(user, "Nguyễn Văn A", "0900000000", "1 Nguyễn Huệ");
        setId(address, addressId);
        return address;
    }

    private static User staffUser() {
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
