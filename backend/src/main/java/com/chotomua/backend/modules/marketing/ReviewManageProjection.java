package com.chotomua.backend.modules.marketing;

import java.time.Instant;
import java.util.UUID;

/** Projection for the staff review moderation list — review + buyer + product snapshot + who replied. */
public interface ReviewManageProjection {
    UUID getId();
    Integer getRating();
    String getComment();
    String getReplyText();
    Instant getCreatedAt();
    String getBuyerName();
    String getProductName();
    UUID getOrderId();
    String getRepliedByName();
}
