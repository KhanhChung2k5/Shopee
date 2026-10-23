package com.chotomua.backend.modules.crm.domain.campaign;

import com.chotomua.backend.modules.crm.port.dto.ProductFilter;

import java.util.List;
import java.util.UUID;

/**
 * Gắn sản phẩm vào chiến dịch: danh sách cụ thể và/hoặc bộ lọc catalog.
 * Lưu in-memory — không thêm bảng.
 */
public record CampaignProductTarget(
        UUID campaignId,
        List<UUID> productIds,
        ProductFilter filter
) {
    public CampaignProductTarget {
        productIds = productIds == null ? List.of() : List.copyOf(productIds);
    }
}
