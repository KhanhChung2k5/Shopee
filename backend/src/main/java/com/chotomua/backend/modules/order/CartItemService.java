package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.CartItemCreateRequest;
import com.chotomua.backend.modules.order.dto.CartItemQuantityRequest;
import com.chotomua.backend.modules.order.dto.CartItemResponse;
import com.chotomua.backend.modules.order.dto.CartItemSelectionRequest;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartItemService {

    private final CartItemRepository cartItemRepository;
    private final ProductVariantLookup productVariantLookup;

    public CartItemService(
            CartItemRepository cartItemRepository,
            ProductVariantLookup productVariantLookup
    ) {
        this.cartItemRepository = cartItemRepository;
        this.productVariantLookup = productVariantLookup;
    }

    @Transactional(readOnly = true)
    public List<CartItemResponse> listForUser(UUID userId) {
        return cartItemRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CartItemResponse add(UUID userId, CartItemCreateRequest request) {
        if (!productVariantLookup.existsActiveById(request.variantId())) {
            throw new NoSuchElementException("Không tìm thấy biến thể sản phẩm đang hoạt động");
        }

        CartItem item = cartItemRepository.findByUserIdAndVariantId(userId, request.variantId())
                .map(existing -> {
                    int nextQuantity = safeAdd(existing.getQuantity(), request.quantity());
                    requireAvailableStock(request.variantId(), nextQuantity);
                    existing.setQuantity(nextQuantity);
                    return existing;
                })
                .orElseGet(() -> {
                    requireAvailableStock(request.variantId(), request.quantity());
                    return new CartItem(userId, request.variantId(), request.quantity());
                });

        return toResponse(cartItemRepository.save(item));
    }

    @Transactional
    public CartItemResponse updateQuantity(UUID userId, UUID itemId, CartItemQuantityRequest request) {
        CartItem item = requireOwnedItem(userId, itemId);
        requireAvailableStock(item.getVariantId(), request.quantity());
        item.setQuantity(request.quantity());
        return toResponse(cartItemRepository.save(item));
    }

    @Transactional
    public CartItemResponse updateSelection(UUID userId, UUID itemId, CartItemSelectionRequest request) {
        CartItem item = requireOwnedItem(userId, itemId);
        item.setIsSelected(request.isSelected());
        return toResponse(cartItemRepository.save(item));
    }

    @Transactional
    public void delete(UUID userId, UUID itemId) {
        cartItemRepository.delete(requireOwnedItem(userId, itemId));
    }

    private CartItem requireOwnedItem(UUID userId, UUID itemId) {
        return cartItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm trong giỏ hàng"));
    }

    private CartItemResponse toResponse(CartItem item) {
        CartProductSnapshot product = productVariantLookup.findCartProductById(item.getVariantId())
                .orElse(null);
        return CartItemResponse.from(item, product);
    }

    private int safeAdd(int currentQuantity, int addedQuantity) {
        try {
            return Math.addExact(currentQuantity, addedQuantity);
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Số lượng sản phẩm vượt quá giới hạn");
        }
    }

    private void requireAvailableStock(UUID variantId, int requestedQuantity) {
        productVariantLookup.findCartProductById(variantId).ifPresent(product -> {
            if (requestedQuantity > product.availableQuantity()) {
                throw new IllegalArgumentException(
                        "Số lượng yêu cầu vượt tồn kho. Hiện chỉ còn " + product.availableQuantity() + " sản phẩm"
                );
            }
        });
    }
}
