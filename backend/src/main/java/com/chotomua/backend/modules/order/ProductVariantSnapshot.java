package com.chotomua.backend.modules.order;

import java.math.BigDecimal;
import java.util.UUID;

/** Immutable Catalog data copied into an OrderItem at checkout time. */
public record ProductVariantSnapshot(
        UUID variantId,
        BigDecimal unitPrice,
        String productName,
        String attributesJson,
        int availableQuantity
) {
    public ProductVariantSnapshot(
            UUID variantId,
            BigDecimal unitPrice,
            String productName,
            String attributesJson
    ) {
        this(variantId, unitPrice, productName, attributesJson, Integer.MAX_VALUE);
    }
}
