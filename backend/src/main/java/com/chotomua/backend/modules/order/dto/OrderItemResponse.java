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
        String variantAttributesSnapshot
) {
    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getVariantId(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getProductNameSnapshot(),
                item.getVariantAttributesSnapshot()
        );
    }
}
