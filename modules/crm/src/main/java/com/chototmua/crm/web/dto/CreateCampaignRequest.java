package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.ProductFilter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Tạo chiến dịch in-app và gửi ngay.
 * Cần ít nhất một phân khúc hoặc một sản phẩm mục tiêu (id cụ thể / bộ lọc).
 */
public record CreateCampaignRequest(
        @NotBlank @Size(max = 255) String name,
        List<UUID> segmentIds,
        @NotBlank @Size(max = 500) String content,
        UUID surveyId,
        Instant startAt,
        Instant endAt,
        List<UUID> productIds,
        ProductFilter filter
) {
}
