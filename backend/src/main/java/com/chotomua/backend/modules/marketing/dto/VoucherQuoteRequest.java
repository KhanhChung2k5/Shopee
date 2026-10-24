package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * {@code items} are the cart lines (product type + line total). They are required for a voucher limited to
 * certain product types, because only those lines' money can be discounted.
 */
public record VoucherQuoteRequest(
        @NotBlank String code,
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal subtotal,
        List<@Valid Item> items
) {
    public VoucherQuoteRequest(String code, BigDecimal subtotal) {
        this(code, subtotal, null);
    }

    public record Item(String productType, @NotNull @DecimalMin("0.00") BigDecimal amount) {
    }
}
