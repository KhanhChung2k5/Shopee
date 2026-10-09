package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.order.dto.CartItemCreateRequest;
import com.chotomua.backend.modules.order.dto.CartItemQuantityRequest;
import com.chotomua.backend.modules.order.dto.CartItemSelectionRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CartItemServiceTest {

    private CartItemRepository cartItemRepository;
    private ProductVariantLookup productVariantLookup;
    private CartItemService cartItemService;

    @BeforeEach
    void setUp() {
        cartItemRepository = mock(CartItemRepository.class);
        productVariantLookup = mock(ProductVariantLookup.class);
        cartItemService = new CartItemService(cartItemRepository, productVariantLookup);
    }

    @Test
    void listForUser_returnsOnlyRepositoryResultsForThatUser() {
        UUID userId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        CartItem item = new CartItem(userId, variantId, 2);
        when(cartItemRepository.findByUserIdOrderByUpdatedAtDesc(userId)).thenReturn(List.of(item));
        when(productVariantLookup.findCartProductById(variantId)).thenReturn(Optional.of(
                new CartProductSnapshot(
                        variantId,
                        "DualSense",
                        "controller",
                        "https://example.test/controller.webp",
                        new BigDecimal("2299000.00"),
                        "{}",
                        true
                )
        ));

        var result = cartItemService.listForUser(userId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().quantity()).isEqualTo(2);
        assertThat(result.getFirst().productName()).isEqualTo("DualSense");
        assertThat(result.getFirst().unitPrice()).isEqualByComparingTo("2299000.00");
        assertThat(result.getFirst().available()).isTrue();
    }

    @Test
    void add_createsCartItemForActiveVariant() {
        UUID userId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        when(productVariantLookup.existsActiveById(variantId)).thenReturn(true);
        when(cartItemRepository.findByUserIdAndVariantId(userId, variantId)).thenReturn(Optional.empty());
        when(cartItemRepository.save(org.mockito.ArgumentMatchers.any(CartItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = cartItemService.add(userId, new CartItemCreateRequest(variantId, 2));

        assertThat(result.variantId()).isEqualTo(variantId);
        assertThat(result.quantity()).isEqualTo(2);
        assertThat(result.isSelected()).isTrue();
    }

    @Test
    void add_increasesQuantityWhenVariantAlreadyExists() {
        UUID userId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        CartItem existing = new CartItem(userId, variantId, 2);
        when(productVariantLookup.existsActiveById(variantId)).thenReturn(true);
        when(cartItemRepository.findByUserIdAndVariantId(userId, variantId)).thenReturn(Optional.of(existing));
        when(cartItemRepository.save(existing)).thenReturn(existing);

        var result = cartItemService.add(userId, new CartItemCreateRequest(variantId, 3));

        assertThat(result.quantity()).isEqualTo(5);
    }

    @Test
    void add_rejectsMissingOrInactiveVariant() {
        UUID userId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        when(productVariantLookup.existsActiveById(variantId)).thenReturn(false);

        assertThatThrownBy(() -> cartItemService.add(userId, new CartItemCreateRequest(variantId, 1)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("biến thể sản phẩm");
        verify(cartItemRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void add_rejectsQuantityAboveAvailableStock() {
        UUID userId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        when(productVariantLookup.existsActiveById(variantId)).thenReturn(true);
        when(cartItemRepository.findByUserIdAndVariantId(userId, variantId)).thenReturn(Optional.empty());
        when(productVariantLookup.findCartProductById(variantId)).thenReturn(Optional.of(
                new CartProductSnapshot(
                        variantId, "DualSense", "controller", null,
                        new BigDecimal("2299000.00"), "{}", true, 2
                )
        ));

        assertThatThrownBy(() -> cartItemService.add(userId, new CartItemCreateRequest(variantId, 3)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chỉ còn 2");
        verify(cartItemRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateQuantity_requiresItemOwnedByCurrentUser() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        when(cartItemRepository.findByIdAndUserId(itemId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartItemService.updateQuantity(
                userId,
                itemId,
                new CartItemQuantityRequest(4)
        )).isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void updateQuantity_rejectsQuantityAboveAvailableStock() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        CartItem item = new CartItem(userId, variantId, 1);
        when(cartItemRepository.findByIdAndUserId(itemId, userId)).thenReturn(Optional.of(item));
        when(productVariantLookup.findCartProductById(variantId)).thenReturn(Optional.of(
                new CartProductSnapshot(
                        variantId, "DualSense", "controller", null,
                        new BigDecimal("2299000.00"), "{}", true, 4
                )
        ));

        assertThatThrownBy(() -> cartItemService.updateQuantity(
                userId, itemId, new CartItemQuantityRequest(5)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chỉ còn 4");
        verify(cartItemRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateSelection_changesOwnedItem() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        CartItem item = new CartItem(userId, UUID.randomUUID(), 1);
        when(cartItemRepository.findByIdAndUserId(itemId, userId)).thenReturn(Optional.of(item));
        when(cartItemRepository.save(item)).thenReturn(item);

        var result = cartItemService.updateSelection(
                userId,
                itemId,
                new CartItemSelectionRequest(false)
        );

        assertThat(result.isSelected()).isFalse();
    }

    @Test
    void delete_removesOnlyOwnedItem() {
        UUID userId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        CartItem item = new CartItem(userId, UUID.randomUUID(), 1);
        when(cartItemRepository.findByIdAndUserId(itemId, userId)).thenReturn(Optional.of(item));

        cartItemService.delete(userId, itemId);

        verify(cartItemRepository).delete(item);
    }
}
