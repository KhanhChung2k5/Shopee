package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * Full isolated Order lifecycle through HTTP and the real service layer.
 * Repository answers keep state in memory so no shared database is read or written.
 */
class OrderLifecycleIntegrationFlowTest {

    @Test
    void checkoutConfirmShipAndDeliverPersistsCompleteOrderHistory() throws Exception {
        UUID buyerUserId = UUID.randomUUID();
        UUID salesUserId = UUID.randomUUID();
        UUID warehouseUserId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        UUID firstVariantId = UUID.randomUUID();
        UUID secondVariantId = UUID.randomUUID();

        CartItemRepository cartItemRepository = mock(CartItemRepository.class);
        OrderRepository orderRepository = mock(OrderRepository.class);
        OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
        OrderStatusHistoryRepository historyRepository = mock(OrderStatusHistoryRepository.class);
        AddressRepository addressRepository = mock(AddressRepository.class);
        EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        ProductVariantLookup productVariantLookup = mock(ProductVariantLookup.class);
        WarehouseLookup warehouseLookup = mock(WarehouseLookup.class);

        AtomicReference<Order> storedOrder = new AtomicReference<>();
        List<OrderItem> storedItems = new ArrayList<>();
        List<OrderStatusHistory> storedHistory = new ArrayList<>();

        CartItem firstCartItem = new CartItem(buyerUserId, firstVariantId, 1);
        CartItem secondCartItem = new CartItem(buyerUserId, secondVariantId, 2);
        when(addressRepository.findById(addressId))
                .thenReturn(Optional.of(ownedAddress(buyerUserId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(buyerUserId))
                .thenReturn(List.of(firstCartItem, secondCartItem));
        when(productVariantLookup.findActiveById(firstVariantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        firstVariantId,
                        new BigDecimal("150000.00"),
                        "Tay cầm tích hợp",
                        "{\"color\":\"black\"}"
                )
        ));
        when(productVariantLookup.findActiveById(secondVariantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        secondVariantId,
                        new BigDecimal("200000.00"),
                        "Đĩa game tích hợp",
                        "{\"platform\":\"PS5\"}"
                )
        ));

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) setId(order, UUID.randomUUID());
            storedOrder.set(order);
            return order;
        });
        when(orderRepository.findById(any(UUID.class))).thenAnswer(invocation -> {
            UUID requestedId = invocation.getArgument(0);
            Order order = storedOrder.get();
            return order != null && requestedId.equals(order.getId())
                    ? Optional.of(order)
                    : Optional.empty();
        });
        when(orderRepository.findByIdAndUserId(any(UUID.class), any(UUID.class))).thenAnswer(invocation -> {
            UUID requestedId = invocation.getArgument(0);
            UUID requestedUserId = invocation.getArgument(1);
            Order order = storedOrder.get();
            return order != null
                    && requestedId.equals(order.getId())
                    && requestedUserId.equals(order.getUserId())
                    ? Optional.of(order)
                    : Optional.empty();
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> {
            List<OrderItem> items = invocation.getArgument(0);
            items.forEach(item -> {
                if (item.getId() == null) setId(item, UUID.randomUUID());
            });
            storedItems.addAll(items);
            return items;
        });
        when(orderItemRepository.findByOrderId(any(UUID.class)))
                .thenAnswer(invocation -> List.copyOf(storedItems));
        when(historyRepository.save(any(OrderStatusHistory.class))).thenAnswer(invocation -> {
            OrderStatusHistory history = invocation.getArgument(0);
            if (history.getId() == null) setId(history, UUID.randomUUID());
            storedHistory.add(history);
            return history;
        });
        when(historyRepository.findByOrderIdOrderByChangedAtAsc(any(UUID.class)))
                .thenAnswer(invocation -> List.copyOf(storedHistory));

        Employee salesEmployee = employee(salesUserId, "sales");
        Employee warehouseEmployee = employee(warehouseUserId, "warehouse");
        when(employeeRepository.findByUserId(salesUserId)).thenReturn(Optional.of(salesEmployee));
        when(employeeRepository.findByUserId(warehouseUserId)).thenReturn(Optional.of(warehouseEmployee));
        when(warehouseLookup.existsById(warehouseId)).thenReturn(true);

        OrderService orderService = new OrderService(
                cartItemRepository,
                orderRepository,
                orderItemRepository,
                historyRepository,
                addressRepository,
                employeeRepository,
                productVariantLookup,
                warehouseLookup
        );
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new OrderController(orderService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        Authentication buyer = authentication(buyerUserId, "ROLE_BUYER");
        Authentication sales = authentication(salesUserId, "ROLE_STAFF");
        Authentication warehouse = authentication(warehouseUserId, "ROLE_STAFF");

        mockMvc.perform(post("/orders")
                        .principal(buyer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"addressId\":\"" + addressId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totalAmount").value(550000.0));

        UUID orderId = storedOrder.get().getId();

        mockMvc.perform(patch("/orders/{id}/status", orderId)
                        .principal(sales)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"confirmed\",\"reason\":\"Đã kiểm tra đơn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousStatus").value("pending"))
                .andExpect(jsonPath("$.status").value("confirmed"));

        mockMvc.perform(patch("/orders/{id}/shipping-info", orderId)
                        .principal(warehouse)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": "%s",
                                  "shippingProviderName": "Giao Hàng Nhanh"
                                }
                                """.formatted(warehouseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shipmentStatus").value("packed"))
                .andExpect(jsonPath("$.orderStatus").value("confirmed"));

        mockMvc.perform(patch("/orders/{id}/tracking", orderId)
                        .principal(warehouse)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trackingNo\":\"GHN-KAN281\",\"shipmentStatus\":\"shipping\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shipmentStatus").value("shipping"))
                .andExpect(jsonPath("$.orderStatus").value("shipping"));

        mockMvc.perform(patch("/orders/{id}/tracking", orderId)
                        .principal(warehouse)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trackingNo\":\"GHN-KAN281\",\"shipmentStatus\":\"delivered\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shipmentStatus").value("delivered"))
                .andExpect(jsonPath("$.orderStatus").value("delivered"));

        mockMvc.perform(get("/orders/{id}", orderId).principal(buyer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("delivered"))
                .andExpect(jsonPath("$.shipmentStatus").value("delivered"))
                .andExpect(jsonPath("$.shippingProviderName").value("Giao Hàng Nhanh"))
                .andExpect(jsonPath("$.trackingNo").value("GHN-KAN281"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.statusHistory.length()").value(4))
                .andExpect(jsonPath("$.statusHistory[0].status").value("pending"))
                .andExpect(jsonPath("$.statusHistory[0].changedByType").value("buyer"))
                .andExpect(jsonPath("$.statusHistory[1].status").value("confirmed"))
                .andExpect(jsonPath("$.statusHistory[1].changedBy").value(salesUserId.toString()))
                .andExpect(jsonPath("$.statusHistory[2].status").value("shipping"))
                .andExpect(jsonPath("$.statusHistory[2].changedBy").value(warehouseUserId.toString()))
                .andExpect(jsonPath("$.statusHistory[3].status").value("delivered"));

        assertThat(storedOrder.get().getEmployeeId()).isEqualTo(warehouseEmployee.getId());
        assertThat(storedOrder.get().getWarehouseId()).isEqualTo(warehouseId);
        assertThat(storedHistory).extracting(OrderStatusHistory::getStatus)
                .containsExactly("pending", "confirmed", "shipping", "delivered");
        verify(cartItemRepository).deleteAll(List.of(firstCartItem, secondCartItem));
        verify(historyRepository, times(4)).save(any(OrderStatusHistory.class));
    }

    private static Authentication authentication(UUID userId, String role) {
        return new UsernamePasswordAuthenticationToken(
                userId.toString(),
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
    }

    private static Address ownedAddress(UUID userId, UUID addressId) {
        User user = new User("buyer", "hash");
        setId(user, userId);
        Address address = new Address(user, "Nguyễn Văn A", "0900000000", "1 Nguyễn Huệ");
        setId(address, addressId);
        return address;
    }

    private static Employee employee(UUID userId, String department) {
        User user = new User("staff", "hash");
        setId(user, userId);
        Employee employee = new Employee(user, department);
        setId(employee, UUID.randomUUID());
        return employee;
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
