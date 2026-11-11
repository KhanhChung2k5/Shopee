package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.ProductFilter;

import java.util.List;
import java.util.UUID;

/** Gắn sản phẩm cụ thể và/hoặc bộ lọc catalog vào khảo sát. */
public record SurveyProductTargetRequest(
        List<UUID> productIds,
        ProductFilter filter
) {
}
