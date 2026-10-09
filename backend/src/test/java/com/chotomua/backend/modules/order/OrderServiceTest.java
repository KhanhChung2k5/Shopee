package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.order.dto.OrderCreateRequest;
import com.chotomua.backend.modules.order.dto.OrderShippingInfoRequest;
import com.chotomua.backend.modules.order.dto.OrderStatusUpdateRequest;
import com.chotomua.backend.modules.order.dto.OrderTrackingUpdateRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

class OrderServiceTest {

    private CartItemRepository cartItemRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository orderStatusHistoryRepository;
    private AddressRepository addressRepository;
    private EmployeeRepository employeeRepository;
    private ProductVariantLookup productVariantLookup;
    private WarehouseLookup warehouseLookup;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        cartItemRepository = mock(CartItemRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        orderStatusHistoryRepository = mock(OrderStatusHistoryRepository.class);
        addressRepository = mock(AddressRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        productVariantLookup = mock(ProductVariantLookup.class);
        warehouseLookup = mock(WarehouseLookup.class);
        orderService = new OrderService(
                cartItemRepository,
                orderRepository,
                orderItemRepository,
                orderStatusHistoryRepository,
                addressRepository,
                employeeRepository,
                productVariantLookup,
                warehouseLookup
        );
    }

    @Test
    void createFromSelectedCart_createsOneOrderWithSnapshotsAndClearsSelectedRows() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Address address = ownedAddress(userId, addressId);
        CartItem cartItem = new CartItem(userId, variantId, 2);

        when(addressRepository.findById(addressId)).thenReturn(Optional.of(address));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId))
                .thenReturn(List.of(cartItem));
        when(productVariantLookup.findActiveById(variantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        variantId,
                        new BigDecimal("125000.00"),
                        "Tay cầm",
                        "{\"color\":\"black\"}"
                )
        ));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            setId(order, UUID.randomUUID());
            return order;
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.createFromSelectedCart(userId, new OrderCreateRequest(addressId));

        assertThat(result.subtotalAmount()).isEqualByComparingTo("250000.00");
        assertThat(result.discountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.shippingFeeAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.totalAmount()).isEqualByComparingTo("250000.00");
        assertThat(result.status()).isEqualTo("pending");
        assertThat(result.items()).singleElement().satisfies(item -> {
            assertThat(item.productNameSnapshot()).isEqualTo("Tay cầm");
            assertThat(item.unitPrice()).isEqualByComparingTo("125000.00");
            assertThat(item.lineTotal()).isEqualByComparingTo("250000.00");
        });
        verify(orderStatusHistoryRepository).save(any(OrderStatusHistory.class));
        verify(cartItemRepository).deleteAll(List.of(cartItem));
    }

    @Test
    void createFromSelectedCart_keepsUnitPriceSnapshotWhenCatalogPriceChanges() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        CartItem cartItem = new CartItem(userId, variantId, 3);
        AtomicReference<Order> savedOrder = new AtomicReference<>();
        AtomicReference<List<OrderItem>> savedItems = new AtomicReference<>();

        when(addressRepository.findById(addressId)).thenReturn(Optional.of(ownedAddress(userId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId))
                .thenReturn(List.of(cartItem));
        when(productVariantLookup.findActiveById(variantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        variantId,
                        new BigDecimal("199900.00"),
                        "Tay cầm giá cũ",
                        "{\"color\":\"black\"}"
                )
        ));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            setId(order, UUID.randomUUID());
            savedOrder.set(order);
            return order;
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> {
            List<OrderItem> items = invocation.getArgument(0);
            savedItems.set(List.copyOf(items));
            return items;
        });

        var created = orderService.createFromSelectedCart(userId, new OrderCreateRequest(addressId));

        // Catalog changes after checkout. Historical order reads must use OrderItem snapshots.
        when(productVariantLookup.findActiveById(variantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        variantId,
                        new BigDecimal("249900.00"),
                        "Tay cầm giá mới",
                        "{\"color\":\"white\"}"
                )
        ));
        when(orderRepository.findByIdAndUserId(savedOrder.get().getId(), userId))
                .thenReturn(Optional.of(savedOrder.get()));
        when(orderItemRepository.findByOrderId(savedOrder.get().getId())).thenReturn(savedItems.get());
        when(orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(savedOrder.get().getId()))
                .thenReturn(List.of());

        var detail = orderService.getForBuyer(userId, savedOrder.get().getId());

        assertThat(created.subtotalAmount()).isEqualByComparingTo("599700.00");
        assertThat(detail.totalAmount()).isEqualByComparingTo("599700.00");
        assertThat(detail.items()).singleElement().satisfies(item -> {
            assertThat(item.productNameSnapshot()).isEqualTo("Tay cầm giá cũ");
            assertThat(item.unitPrice()).isEqualByComparingTo("199900.00");
            assertThat(item.lineTotal()).isEqualByComparingTo("599700.00");
            assertThat(item.variantAttributesSnapshot()).isEqualTo("{\"color\":\"black\"}");
        });
        verify(productVariantLookup, times(1)).findActiveById(variantId);
    }

    @Test
    void createFromSelectedCart_rejectsEmptySelection() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        when(addressRepository.findById(addressId)).thenReturn(Optional.of(ownedAddress(userId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId))
                .thenReturn(List.of());

        assertThatThrownBy(() -> orderService.createFromSelectedCart(userId, new OrderCreateRequest(addressId)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chưa có sản phẩm");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void createFromSelectedCart_hidesAddressOwnedByAnotherUser() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        when(addressRepository.findById(addressId))
                .thenReturn(Optional.of(ownedAddress(UUID.randomUUID(), addressId)));

        assertThatThrownBy(() -> orderService.createFromSelectedCart(userId, new OrderCreateRequest(addressId)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("địa chỉ giao hàng");
        verify(cartItemRepository, never()).findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId);
    }

    @Test
    void createFromSelectedCart_keepsCartWhenVariantCannotBeSnapshotted() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        CartItem cartItem = new CartItem(userId, variantId, 1);
        when(addressRepository.findById(addressId)).thenReturn(Optional.of(ownedAddress(userId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId))
                .thenReturn(List.of(cartItem));
        when(productVariantLookup.findActiveById(variantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.createFromSelectedCart(userId, new OrderCreateRequest(addressId)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining(variantId.toString());
        verify(orderRepository, never()).save(any());
        verify(cartItemRepository, never()).deleteAll(any());
    }

    @Test
    void listForBuyer_returnsOnlyOwnedOrdersAndNormalizesStatus() {
        UUID userId = UUID.randomUUID();
        Order order = orderOf(userId);
        when(orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "pending"))
                .thenReturn(List.of(order));
        when(orderItemRepository.countByOrderId(order.getId())).thenReturn(2L);

        var result = orderService.listForBuyer(userId, " PENDING ");

        assertThat(result).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo(order.getId());
            assertThat(summary.itemCount()).isEqualTo(2);
            assertThat(summary.status()).isEqualTo("pending");
        });
    }

    @Test
    void listForBuyer_rejectsUnknownStatus() {
        assertThatThrownBy(() -> orderService.listForBuyer(UUID.randomUUID(), "unknown"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Trạng thái");
    }

    @Test
    void getForBuyer_returnsItemsAndOrderedStatusHistory() {
        UUID userId = UUID.randomUUID();
        Order order = orderOf(userId);
        OrderItem item = new OrderItem(
                order.getId(),
                UUID.randomUUID(),
                1,
                new BigDecimal("100000.00"),
                "Sản phẩm snapshot",
                "{}"
        );
        OrderStatusHistory history = new OrderStatusHistory(
                order.getId(),
                "pending",
                userId,
                "buyer",
                "Tạo đơn hàng"
        );
        when(orderRepository.findByIdAndUserId(order.getId(), userId)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(order.getId())).thenReturn(List.of(item));
        when(orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(order.getId()))
                .thenReturn(List.of(history));

        var result = orderService.getForBuyer(userId, order.getId());

        assertThat(result.items()).hasSize(1);
        assertThat(result.statusHistory()).singleElement()
                .satisfies(entry -> assertThat(entry.status()).isEqualTo("pending"));
    }

    @Test
    void listForEmployeeUser_resolvesEmployeeIdInsteadOfUsingUserIdAsEmployeeId() {
        UUID employeeUserId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        User staffUser = new User("staff", "hash");
        setId(staffUser, employeeUserId);
        Employee employee = new Employee(staffUser, "warehouse");
        setId(employee, employeeId);
        Order assignedOrder = orderOf(UUID.randomUUID());
        assignedOrder.setEmployeeId(employeeId);
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId))
                .thenReturn(List.of(assignedOrder));
        when(orderItemRepository.countByOrderId(assignedOrder.getId())).thenReturn(1L);

        var result = orderService.listForEmployeeUser(employeeUserId, null);

        assertThat(result).hasSize(1);
        verify(orderRepository).findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Test
    void getForBuyer_hidesOrderOwnedByAnotherUser() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findByIdAndUserId(orderId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getForBuyer(userId, orderId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("đơn hàng");
        verify(orderItemRepository, never()).findByOrderId(orderId);
    }

    @Test
    void updateStatusForBuyer_requestsCancellationAndWritesHistory() {
        UUID userId = UUID.randomUUID();
        Order order = orderOf(userId);
        when(orderRepository.findByIdAndUserId(order.getId(), userId)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.updateStatusForBuyer(
                userId,
                order.getId(),
                new OrderStatusUpdateRequest(
                        "cancel_requested",
                        "  Đổi ý  "
                )
        );

        assertThat(result.previousStatus()).isEqualTo("pending");
        assertThat(result.status()).isEqualTo("cancel_requested");
        assertThat(result.change().changedBy()).isEqualTo(userId);
        assertThat(result.change().changedByType()).isEqualTo("buyer");
        assertThat(result.change().reason()).isEqualTo("Đổi ý");
    }

    @Test
    void updateStatusForBuyer_cannotConfirmOrder() {
        assertThatThrownBy(() -> orderService.updateStatusForBuyer(
                UUID.randomUUID(),
                UUID.randomUUID(),
                new OrderStatusUpdateRequest("confirmed", null)
        )).isInstanceOf(AccessDeniedException.class);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateStatus_requiresCancellationReason() {
        UUID userId = UUID.randomUUID();
        Order order = orderOf(userId);
        when(orderRepository.findByIdAndUserId(order.getId(), userId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatusForBuyer(
                userId,
                order.getId(),
                new OrderStatusUpdateRequest("cancel_requested", "  ")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("lý do");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateStatusForEmployeeUser_allowsSalesToConfirmPendingOrder() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "sales");
        Order order = orderOf(UUID.randomUUID());
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.updateStatusForEmployeeUser(
                employeeUserId,
                order.getId(),
                new OrderStatusUpdateRequest("confirmed", null)
        );

        assertThat(result.status()).isEqualTo("confirmed");
        ArgumentCaptor<OrderStatusHistory> historyCaptor = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(orderStatusHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getChangedBy()).isEqualTo(employeeUserId);
        assertThat(historyCaptor.getValue().getChangedByType()).isEqualTo("employee");
    }

    @Test
    void updateStatusForEmployeeUser_confirmsBuyerCancellationRequest() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "sales");
        Order order = orderOf(UUID.randomUUID());
        order.setStatus("cancel_requested");
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.updateStatusForEmployeeUser(
                employeeUserId,
                order.getId(),
                new OrderStatusUpdateRequest("cancelled", "Xác nhận yêu cầu của khách")
        );

        assertThat(result.previousStatus()).isEqualTo("cancel_requested");
        assertThat(result.status()).isEqualTo("cancelled");
        assertThat(result.change().changedBy()).isEqualTo(employeeUserId);
        assertThat(result.change().changedByType()).isEqualTo("employee");
    }

    @Test
    void updateStatusForEmployeeUser_rejectsWarehouseDepartment() {
        UUID employeeUserId = UUID.randomUUID();
        when(employeeRepository.findByUserId(employeeUserId))
                .thenReturn(Optional.of(employeeOf(employeeUserId, "warehouse")));

        assertThatThrownBy(() -> orderService.updateStatusForEmployeeUser(
                employeeUserId,
                UUID.randomUUID(),
                new OrderStatusUpdateRequest("confirmed", null)
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không có quyền");
        verify(orderRepository, never()).findById(any());
    }

    @Test
    void updateStatus_rejectsInvalidTransitionWithConflict() {
        UUID userId = UUID.randomUUID();
        Order order = orderOf(userId);
        order.setStatus("shipping");
        when(orderRepository.findByIdAndUserId(order.getId(), userId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatusForBuyer(
                userId,
                order.getId(),
                new OrderStatusUpdateRequest("cancel_requested", "Quá muộn")
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("shipping");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateShippingInfo_packsConfirmedOrderAndAssignsWarehouseEmployee() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        UUID warehouseId = UUID.randomUUID();
        Order order = orderOf(UUID.randomUUID());
        order.setStatus("confirmed");
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(warehouseLookup.existsById(warehouseId)).thenReturn(true);
        when(orderRepository.save(order)).thenReturn(order);

        var result = orderService.updateShippingInfo(
                employeeUserId,
                order.getId(),
                new OrderShippingInfoRequest(warehouseId, "  Giao Hàng Nhanh  ")
        );

        assertThat(result.employeeId()).isEqualTo(employee.getId());
        assertThat(result.warehouseId()).isEqualTo(warehouseId);
        assertThat(result.shippingProviderName()).isEqualTo("Giao Hàng Nhanh");
        assertThat(result.shipmentStatus()).isEqualTo("packed");
        assertThat(result.orderStatus()).isEqualTo("confirmed");
    }

    @Test
    void updateShippingInfo_rejectsUnknownWarehouseWithoutChangingOrder() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        UUID warehouseId = UUID.randomUUID();
        Order order = orderOf(UUID.randomUUID());
        order.setStatus("confirmed");
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(warehouseLookup.existsById(warehouseId)).thenReturn(false);

        assertThatThrownBy(() -> orderService.updateShippingInfo(
                employeeUserId,
                order.getId(),
                new OrderShippingInfoRequest(warehouseId, "Giao Hàng Nhanh")
        )).isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("kho xuất hàng");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateShippingInfo_rejectsWarehouseEmployeeWhenAnotherEmployeeOwnsOrder() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        Order order = orderOf(UUID.randomUUID());
        order.setStatus("confirmed");
        order.setEmployeeId(UUID.randomUUID());
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateShippingInfo(
                employeeUserId,
                order.getId(),
                new OrderShippingInfoRequest(UUID.randomUUID(), "Giao Hàng Nhanh")
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("nhân viên khác");
        verify(warehouseLookup, never()).existsById(any());
    }

    @Test
    void updateTracking_movesPackedOrderToShippingAndWritesOrderHistory() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        Order order = packedOrder(employee.getId());
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.updateTracking(
                employeeUserId,
                order.getId(),
                new OrderTrackingUpdateRequest(" GHN-001 ", "shipping")
        );

        assertThat(result.trackingNo()).isEqualTo("GHN-001");
        assertThat(result.shipmentStatus()).isEqualTo("shipping");
        assertThat(result.orderStatus()).isEqualTo("shipping");
        ArgumentCaptor<OrderStatusHistory> historyCaptor = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(orderStatusHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getStatus()).isEqualTo("shipping");
        assertThat(historyCaptor.getValue().getChangedBy()).isEqualTo(employeeUserId);
    }

    @Test
    void updateTracking_movesShippingOrderToDelivered() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        Order order = packedOrder(employee.getId());
        order.setStatus("shipping");
        order.setShipmentStatus("shipping");
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.updateTracking(
                employeeUserId,
                order.getId(),
                new OrderTrackingUpdateRequest("GHN-001", "delivered")
        );

        assertThat(result.shipmentStatus()).isEqualTo("delivered");
        assertThat(result.orderStatus()).isEqualTo("delivered");
    }

    @Test
    void updateTracking_rejectsSkippingShippingState() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        Order order = packedOrder(employee.getId());
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateTracking(
                employeeUserId,
                order.getId(),
                new OrderTrackingUpdateRequest("GHN-001", "delivered")
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("packed");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateTracking_doesNotReviveCancelledPackedOrder() {
        UUID employeeUserId = UUID.randomUUID();
        Employee employee = employeeOf(employeeUserId, "warehouse");
        Order order = packedOrder(employee.getId());
        order.setStatus("cancelled");
        when(employeeRepository.findByUserId(employeeUserId)).thenReturn(Optional.of(employee));
        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateTracking(
                employeeUserId,
                order.getId(),
                new OrderTrackingUpdateRequest("GHN-001", "shipping")
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cancelled/packed");
        verify(orderRepository, never()).save(any());
    }

    private static Address ownedAddress(UUID userId, UUID addressId) {
        User user = new User("buyer", "hash");
        setId(user, userId);
        Address address = new Address(user, "Nguyễn Văn A", "0900000000", "1 Nguyễn Huệ");
        setId(address, addressId);
        return address;
    }

    private static Order orderOf(UUID userId) {
        Order order = new Order(
                userId,
                UUID.randomUUID(),
                "1 Nguyễn Huệ",
                new BigDecimal("100000.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("100000.00")
        );
        setId(order, UUID.randomUUID());
        return order;
    }

    private static Employee employeeOf(UUID userId, String department) {
        User user = new User("staff", "hash");
        setId(user, userId);
        Employee employee = new Employee(user, department);
        setId(employee, UUID.randomUUID());
        return employee;
    }

    private static Order packedOrder(UUID employeeId) {
        Order order = orderOf(UUID.randomUUID());
        order.setStatus("confirmed");
        order.setEmployeeId(employeeId);
        order.setWarehouseId(UUID.randomUUID());
        order.setShippingProviderName("Giao Hàng Nhanh");
        order.setShipmentStatus("packed");
        return order;
    }

    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
