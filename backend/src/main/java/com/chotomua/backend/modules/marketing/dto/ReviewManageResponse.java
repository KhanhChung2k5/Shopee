package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.ReviewManageProjection;
import java.time.Instant;
import java.util.UUID;

public record ReviewManageResponse(
        UUID id, int rating, String comment, String replyText, Instant createdAt,
        String buyerName, String productName, UUID orderId, String repliedByName
) {
    public static ReviewManageResponse from(ReviewManageProjection p) {
        return new ReviewManageResponse(p.getId(), p.getRating(), p.getComment(), p.getReplyText(), p.getCreatedAt(),
                p.getBuyerName(), p.getProductName(), p.getOrderId(), p.getRepliedByName());
    }
}
