package com.chotomua.backend.modules.crm.web.dto;

import com.chotomua.backend.modules.crm.port.dto.ProductFilter;

import java.util.List;
import java.util.UUID;

/** Gắn sản phẩm cụ thể và/hoặc bộ lọc catalog vào khảo sát. */
public record SurveyProductTargetRequest(
        List<UUID> productIds,
        ProductFilter filter
) {
}
