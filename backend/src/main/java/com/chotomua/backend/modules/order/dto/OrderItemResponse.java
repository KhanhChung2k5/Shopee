package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.OrderItem;
import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
        UUID id,
        UUID variantId,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String productNameSnapshot,
        String variantAttributesSnapshot,
        String imageUrl
) {
    public OrderItemResponse(
            UUID id,
            UUID variantId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            String productNameSnapshot,
            String variantAttributesSnapshot
    ) {
        this(id, variantId, quantity, unitPrice, lineTotal, productNameSnapshot, variantAttributesSnapshot, null);
    }

    public static OrderItemResponse from(OrderItem item) {
        return from(item, null);
    }

    public static OrderItemResponse from(OrderItem item, String imageUrl) {
        return new OrderItemResponse(
                item.getId(),
                item.getVariantId(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getProductNameSnapshot(),
                item.getVariantAttributesSnapshot(),
                imageUrl
        );
    }
}
