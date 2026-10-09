package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceDiscountRequest(
        @NotNull UUID promotionProgramId,
        BigDecimal discountAmount,
        BigDecimal discountPercent
) {
}
