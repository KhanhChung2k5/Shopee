package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record VoucherQuoteRequest(
        @NotBlank String code,
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal subtotal
) {
}
