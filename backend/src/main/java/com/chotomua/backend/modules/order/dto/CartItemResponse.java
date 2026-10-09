package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.CartItem;
import com.chotomua.backend.modules.order.CartProductSnapshot;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CartItemResponse(
        UUID id,
        UUID variantId,
        String productName,
        String productType,
        String imageUrl,
        BigDecimal unitPrice,
        String attributesJson,
        int quantity,
        boolean isSelected,
        boolean available,
        OffsetDateTime updatedAt
) {
    public static CartItemResponse from(CartItem item, CartProductSnapshot product) {
        return new CartItemResponse(
                item.getId(),
                item.getVariantId(),
                product == null ? null : product.productName(),
                product == null ? null : product.productType(),
                product == null ? null : product.imageUrl(),
                product == null ? null : product.unitPrice(),
                product == null ? null : product.attributesJson(),
                item.getQuantity(),
                item.getIsSelected(),
                product != null && product.available(),
                item.getUpdatedAt()
        );
    }
}
