package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chotomua.backend.common.web.GlobalExceptionHandler;
import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Isolated checkout flow test: HTTP controller and real service, with persistence/catalog
 * boundaries mocked so the shared team database is never touched.
 */
class OrderCheckoutFlowTest {

    private CartItemRepository cartItemRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository orderStatusHistoryRepository;
    private AddressRepository addressRepository;
    private ProductVariantLookup productVariantLookup;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        cartItemRepository = mock(CartItemRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        orderStatusHistoryRepository = mock(OrderStatusHistoryRepository.class);
        addressRepository = mock(AddressRepository.class);
        productVariantLookup = mock(ProductVariantLookup.class);

        OrderService orderService = new OrderService(
                cartItemRepository,
                orderRepository,
                orderItemRepository,
                orderStatusHistoryRepository,
                addressRepository,
                mock(EmployeeRepository.class),
                productVariantLookup,
                mock(WarehouseLookup.class)
        );
        mockMvc = MockMvcBuilders
                .standaloneSetup(new OrderController(orderService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void checkoutTwoSelectedCartItemsCreatesOneOrderWithTwoOrderItems() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID firstVariantId = UUID.randomUUID();
        UUID secondVariantId = UUID.randomUUID();
        CartItem firstCartItem = new CartItem(userId, firstVariantId, 2);
        CartItem secondCartItem = new CartItem(userId, secondVariantId, 3);

        when(addressRepository.findById(addressId)).thenReturn(Optional.of(ownedAddress(userId, addressId)));
        when(cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId))
                .thenReturn(List.of(firstCartItem, secondCartItem));
        when(productVariantLookup.findActiveById(firstVariantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        firstVariantId,
                        new BigDecimal("120000.00"),
                        "Tay cầm A",
                        "{\"color\":\"black\"}"
                )
        ));
        when(productVariantLookup.findActiveById(secondVariantId)).thenReturn(Optional.of(
                new ProductVariantSnapshot(
                        secondVariantId,
                        new BigDecimal("75000.00"),
                        "Đĩa game B",
                        "{\"platform\":\"PS5\"}"
                )
        ));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            setId(order, UUID.randomUUID());
            return order;
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var authentication = new UsernamePasswordAuthenticationToken(
                userId.toString(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_BUYER"))
        );

        mockMvc.perform(post("/orders")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"addressId\":\"" + addressId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.subtotalAmount").value(465000.0))
                .andExpect(jsonPath("$.totalAmount").value(465000.0))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].variantId").value(firstVariantId.toString()))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].lineTotal").value(240000.0))
                .andExpect(jsonPath("$.items[1].variantId").value(secondVariantId.toString()))
                .andExpect(jsonPath("$.items[1].quantity").value(3))
                .andExpect(jsonPath("$.items[1].lineTotal").value(225000.0));

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, times(1)).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getSubtotalAmount()).isEqualByComparingTo("465000.00");
        assertThat(orderCaptor.getValue().getTotalAmount()).isEqualByComparingTo("465000.00");
        verify(orderItemRepository, times(1)).saveAll(any());
        verify(orderStatusHistoryRepository, times(1)).save(any(OrderStatusHistory.class));
        verify(cartItemRepository, times(1)).deleteAll(List.of(firstCartItem, secondCartItem));
    }

    private static Address ownedAddress(UUID userId, UUID addressId) {
        User user = new User("buyer", "hash");
        setId(user, userId);
        Address address = new Address(user, "Nguyễn Văn A", "0900000000", "1 Nguyễn Huệ");
        setId(address, addressId);
        return address;
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
