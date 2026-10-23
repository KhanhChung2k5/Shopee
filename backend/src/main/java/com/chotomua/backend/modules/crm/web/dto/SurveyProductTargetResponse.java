package com.chotomua.backend.modules.crm.web.dto;

import com.chotomua.backend.modules.crm.port.dto.ProductFilter;

import java.util.List;
import java.util.UUID;

/**
 * Target đã lưu và tập sản phẩm resolve (id cụ thể ∪ bộ lọc).
 */
public record SurveyProductTargetResponse(
        UUID surveyId,
        List<UUID> productIds,
        ProductFilter filter,
        List<UUID> resolvedProductIds
) {
}
