package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Một dòng gợi ý trên REST. */
public record RecommendationItemResponse(
        UUID productId,
        String name,
        String brandName,
        String productType,
        String categoryName,
        String genre,
        List<String> platforms,
        BigDecimal price,
        String reason,
        String reasonLabel
) {
}
