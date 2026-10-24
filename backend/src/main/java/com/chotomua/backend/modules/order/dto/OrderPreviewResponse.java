package com.chotomua.backend.modules.order.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * What the selected cart would cost if ordered now — the same pricing POST /orders uses:
 * SKU promotion per line, then the best invoice promotion, then the voucher. Nothing is reserved or saved.
 */
public record OrderPreviewResponse(
        List<Line> lines,
        BigDecimal subtotal,
        BigDecimal invoiceDiscount,
        String invoiceProgramName,
        String voucherCode,
        BigDecimal voucherDiscount,
        /** Why the voucher does not apply right now (expired, wrong tier, no matching products…); null when it does. */
        String voucherError,
        BigDecimal shippingFee,
        BigDecimal total
) {
    public record Line(
            UUID cartItemId,
            UUID variantId,
            String productName,
            int quantity,
            BigDecimal listPrice,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            /** "flash", "percent" or null. */
            String promotionKind,
            String promotionProgramName
    ) {
    }
}
