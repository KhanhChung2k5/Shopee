package com.chototmua.crm.domain.survey;

import com.chototmua.crm.port.dto.ProductFilter;

import java.util.List;
import java.util.UUID;

/**
 * Gắn sản phẩm vào khảo sát: danh sách cụ thể và/hoặc bộ lọc catalog.
 * Lưu in-memory — không thêm bảng.
 */
public record SurveyProductTarget(
        UUID surveyId,
        List<UUID> productIds,
        ProductFilter filter
) {
    public SurveyProductTarget {
        productIds = productIds == null ? List.of() : List.copyOf(productIds);
    }
}
