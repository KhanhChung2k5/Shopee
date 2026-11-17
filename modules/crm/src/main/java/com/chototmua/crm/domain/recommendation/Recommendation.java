package com.chototmua.crm.domain.recommendation;

import com.chototmua.crm.port.dto.ProductView;

/**
 * Một sản phẩm gợi ý kèm lý do. Chỉ gồm hàng {@code published}, không gồm hàng đã sở hữu.
 */
public record Recommendation(
        ProductView product,
        RecommendationReason reason
) {
}
