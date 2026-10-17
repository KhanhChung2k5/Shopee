package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.PromotionProductDetail;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductDiscountResponse(
        UUID id, UUID promotionProgramId, UUID variantId, BigDecimal discountPercent,
        BigDecimal flashPrice, Integer limitQty, Integer soldQty
) {
    public static ProductDiscountResponse from(PromotionProductDetail detail) {
        return new ProductDiscountResponse(detail.getId(), detail.getPromotionProgramId(), detail.getVariantId(),
                detail.getDiscountPercent(), detail.getFlashPrice(), detail.getLimitQty(), detail.getSoldQty());
    }
}
