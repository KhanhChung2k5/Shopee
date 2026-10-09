package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.PromotionInvoiceDetail;
import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceDiscountResponse(UUID id, UUID promotionProgramId,
                                      BigDecimal discountAmount, BigDecimal discountPercent) {
    public static InvoiceDiscountResponse from(PromotionInvoiceDetail detail) {
        return new InvoiceDiscountResponse(detail.getId(), detail.getPromotionProgramId(),
                detail.getDiscountAmount(), detail.getDiscountPercent());
    }
}
