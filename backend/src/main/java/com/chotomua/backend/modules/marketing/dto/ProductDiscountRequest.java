package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductDiscountRequest(
        @NotNull UUID promotionProgramId,
        @NotNull UUID variantId,
        BigDecimal discountPercent,
        BigDecimal flashPrice,
        Integer limitQty
) {
}
