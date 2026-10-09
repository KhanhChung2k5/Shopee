package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chotomua.backend.common.web.GlobalExceptionHandler;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** HTTP-level IDOR tests for buyer-owned Cart and Order resources. */
class OrderCartSecurityFlowTest {

    private CartItemRepository cartItemRepository;
    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository orderStatusHistoryRepository;
    private ProductVariantLookup productVariantLookup;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        cartItemRepository = mock(CartItemRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderItemRepository = mock(OrderItemRepository.class);
        orderStatusHistoryRepository = mock(OrderStatusHistoryRepository.class);
        productVariantLookup = mock(ProductVariantLookup.class);

        CartItemService cartItemService = new CartItemService(cartItemRepository, productVariantLookup);
        OrderService orderService = new OrderService(
                cartItemRepository,
                orderRepository,
                orderItemRepository,
                orderStatusHistoryRepository,
                mock(AddressRepository.class),
                mock(EmployeeRepository.class),
                productVariantLookup,
                mock(WarehouseLookup.class)
        );

        mockMvc = MockMvcBuilders
                .standaloneSetup(
                        new CartItemController(cartItemService),
                        new OrderController(orderService)
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void buyerCannotReadOrCancelAnotherUsersOrder() throws Exception {
        UUID attackerId = UUID.randomUUID();
        UUID anotherUsersOrderId = UUID.randomUUID();
        Authentication attacker = buyer(attackerId);
        when(orderRepository.findByIdAndUserId(anotherUsersOrderId, attackerId))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/orders/{id}", anotherUsersOrderId).principal(attacker))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        mockMvc.perform(patch("/orders/{id}/status", anotherUsersOrderId)
                        .principal(attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"cancel_requested\",\"reason\":\"Thử huỷ đơn người khác\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        verify(orderRepository, times(2)).findByIdAndUserId(anotherUsersOrderId, attackerId);
        verify(orderRepository, never()).findById(anotherUsersOrderId);
        verify(orderRepository, never()).save(any(Order.class));
        verify(orderItemRepository, never()).findByOrderId(anotherUsersOrderId);
        verify(orderStatusHistoryRepository, never()).findByOrderIdOrderByChangedAtAsc(anotherUsersOrderId);
        verify(orderStatusHistoryRepository, never()).save(any(OrderStatusHistory.class));
    }

    @Test
    void buyerCannotChangeOrDeleteAnotherUsersCartItem() throws Exception {
        UUID attackerId = UUID.randomUUID();
        UUID anotherUsersCartItemId = UUID.randomUUID();
        Authentication attacker = buyer(attackerId);
        when(cartItemRepository.findByIdAndUserId(anotherUsersCartItemId, attackerId))
                .thenReturn(Optional.empty());

        mockMvc.perform(patch("/cart-items/{id}", anotherUsersCartItemId)
                        .principal(attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":5}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/cart-items/{id}/selection", anotherUsersCartItemId)
                        .principal(attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isSelected\":false}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/cart-items/{id}", anotherUsersCartItemId).principal(attacker))
                .andExpect(status().isNotFound());

        verify(cartItemRepository, times(3)).findByIdAndUserId(anotherUsersCartItemId, attackerId);
        verify(cartItemRepository, never()).save(any(CartItem.class));
        verify(cartItemRepository, never()).delete(any(CartItem.class));
    }

    @Test
    void addCartItemUsesAuthenticatedBuyerAndIgnoresSpoofedUserId() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Authentication authenticatedBuyer = buyer(authenticatedUserId);
        when(productVariantLookup.existsActiveById(variantId)).thenReturn(true);
        when(cartItemRepository.findByUserIdAndVariantId(authenticatedUserId, variantId))
                .thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productVariantLookup.findCartProductById(variantId)).thenReturn(Optional.empty());

        mockMvc.perform(post("/cart-items")
                        .principal(authenticatedBuyer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": "%s",
                                  "variantId": "%s",
                                  "quantity": 2
                                }
                                """.formatted(spoofedUserId, variantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.variantId").value(variantId.toString()))
                .andExpect(jsonPath("$.quantity").value(2));

        ArgumentCaptor<CartItem> cartItemCaptor = ArgumentCaptor.forClass(CartItem.class);
        verify(cartItemRepository).save(cartItemCaptor.capture());
        assertThat(cartItemCaptor.getValue().getUserId()).isEqualTo(authenticatedUserId);
        assertThat(cartItemCaptor.getValue().getUserId()).isNotEqualTo(spoofedUserId);
        verify(cartItemRepository).findByUserIdAndVariantId(authenticatedUserId, variantId);
        verify(cartItemRepository, never()).findByUserIdAndVariantId(spoofedUserId, variantId);
    }

    @Test
    void orderAndCartListsAreScopedToAuthenticatedBuyer() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();
        Authentication authenticatedBuyer = buyer(authenticatedUserId);
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(authenticatedUserId)).thenReturn(List.of());
        when(cartItemRepository.findByUserIdOrderByUpdatedAtDesc(authenticatedUserId)).thenReturn(List.of());

        mockMvc.perform(get("/orders")
                        .principal(authenticatedBuyer)
                        .param("userId", spoofedUserId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/cart-items")
                        .principal(authenticatedBuyer)
                        .param("userId", spoofedUserId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(orderRepository).findByUserIdOrderByCreatedAtDesc(authenticatedUserId);
        verify(cartItemRepository).findByUserIdOrderByUpdatedAtDesc(authenticatedUserId);
        verify(orderRepository, never()).findByUserIdOrderByCreatedAtDesc(spoofedUserId);
        verify(cartItemRepository, never()).findByUserIdOrderByUpdatedAtDesc(spoofedUserId);
    }

    private static Authentication buyer(UUID userId) {
        return new UsernamePasswordAuthenticationToken(
                userId.toString(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_BUYER"))
        );
    }
}
