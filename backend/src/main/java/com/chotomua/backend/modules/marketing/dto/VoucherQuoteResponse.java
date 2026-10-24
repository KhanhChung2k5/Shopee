package com.chotomua.backend.modules.marketing.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** {@code eligibleSubtotal} is the part of the subtotal the voucher applies to (only its product types). */
public record VoucherQuoteResponse(
        UUID voucherId,
        String code,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal payableAmount,
        BigDecimal eligibleSubtotal
) {
    public VoucherQuoteResponse(UUID voucherId, String code, BigDecimal subtotal, BigDecimal discountAmount,
                                BigDecimal payableAmount) {
        this(voucherId, code, subtotal, discountAmount, payableAmount, subtotal);
    }
}
