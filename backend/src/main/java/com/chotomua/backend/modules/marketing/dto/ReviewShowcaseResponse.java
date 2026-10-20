package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.ReviewShowcaseProjection;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReviewShowcaseResponse(
        UUID id, int rating, String comment, String replyText,
        OffsetDateTime createdAt, String buyerName, String productName
) {
    public static ReviewShowcaseResponse from(ReviewShowcaseProjection p) {
        return new ReviewShowcaseResponse(p.getId(), p.getRating(), p.getComment(), p.getReplyText(),
                p.getCreatedAt(), p.getBuyerName(), p.getProductName());
    }
}
