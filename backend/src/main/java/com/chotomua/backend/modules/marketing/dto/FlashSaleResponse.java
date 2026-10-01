package com.chotomua.backend.modules.marketing.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FlashSaleResponse(UUID id, UUID productId, UUID variantId, String sku, String productName,
                                String productType, String imageUrl, BigDecimal originalPrice,
                                BigDecimal flashPrice, int soldQty, int limitQty, OffsetDateTime endsAt) {
}
