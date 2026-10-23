package com.chotomua.backend.modules.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Kết quả đẩy gợi ý vào hộp thư in-app. */
public record RecommendationPushResponse(
        UUID referenceId,
        String referenceType,
        int sentCount,
        List<SkippedRecipientResponse> skipped
) {
}
