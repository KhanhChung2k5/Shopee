package com.chotomua.backend.modules.order;

import java.math.BigDecimal;
import java.util.UUID;

/** Read-only Catalog data needed to render one cart line. */
public record CartProductSnapshot(
        UUID variantId,
        String productName,
        String productType,
        String imageUrl,
        BigDecimal unitPrice,
        String attributesJson,
        boolean available,
        int availableQuantity
) {
    public CartProductSnapshot(
            UUID variantId,
            String productName,
            String productType,
            String imageUrl,
            BigDecimal unitPrice,
            String attributesJson,
            boolean available
    ) {
        this(variantId, productName, productType, imageUrl, unitPrice, attributesJson, available, Integer.MAX_VALUE);
    }
}
