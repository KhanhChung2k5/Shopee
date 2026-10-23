package com.chotomua.backend.modules.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Danh sách gợi ý theo khách. */
public record RecommendationListResponse(
        UUID userId,
        List<RecommendationItemResponse> items
) {
}
