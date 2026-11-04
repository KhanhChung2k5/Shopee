package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/** Exactly one of amount / percent. {@code minOrderAmount} and {@code maxDiscountAmount} (percent only) are optional. */
public record InvoiceDiscountRequest(
        @NotNull UUID promotionProgramId,
        BigDecimal discountAmount,
        BigDecimal discountPercent,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount
) {
    public InvoiceDiscountRequest(UUID promotionProgramId, BigDecimal discountAmount, BigDecimal discountPercent) {
        this(promotionProgramId, discountAmount, discountPercent, null, null);
    }
}
