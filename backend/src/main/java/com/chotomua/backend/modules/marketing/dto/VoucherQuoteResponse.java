package com.chotomua.backend.modules.marketing.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record VoucherQuoteResponse(
        UUID voucherId,
        String code,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal payableAmount
) {
}
