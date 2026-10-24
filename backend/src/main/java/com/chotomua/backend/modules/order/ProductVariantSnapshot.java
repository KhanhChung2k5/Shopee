package com.chotomua.backend.modules.order;

import java.math.BigDecimal;
import java.util.UUID;

/** Immutable Catalog data copied into an OrderItem at checkout time. */
public record ProductVariantSnapshot(
        UUID variantId,
        BigDecimal unitPrice,
        String productName,
        String attributesJson,
        int availableQuantity,
        /** products.product_type — lets checkout tell a voucher which lines it may discount. */
        String productType,
        /** The SKU promotion behind {@code unitPrice} (flash price or % off); null when sold at list price. */
        Promotion promotion
) {
    /** Which promotion_product_details row priced this line, and the list price it was taken off. */
    public record Promotion(UUID detailId, boolean flash, BigDecimal listPrice, String programName) {
    }

    public ProductVariantSnapshot(UUID variantId, BigDecimal unitPrice, String productName, String attributesJson,
                                  int availableQuantity, String productType) {
        this(variantId, unitPrice, productName, attributesJson, availableQuantity, productType, null);
    }

    public ProductVariantSnapshot(UUID variantId, BigDecimal unitPrice, String productName, String attributesJson,
                                  int availableQuantity) {
        this(variantId, unitPrice, productName, attributesJson, availableQuantity, null);
    }

    public ProductVariantSnapshot(
            UUID variantId,
            BigDecimal unitPrice,
            String productName,
            String attributesJson
    ) {
        this(variantId, unitPrice, productName, attributesJson, Integer.MAX_VALUE);
    }

    /** Same line re-priced by a promotion. */
    public ProductVariantSnapshot withPromotion(BigDecimal promotedPrice, Promotion applied) {
        return new ProductVariantSnapshot(variantId, promotedPrice, productName, attributesJson, availableQuantity,
                productType, applied);
    }
}
