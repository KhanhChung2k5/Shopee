package com.chotomua.backend.modules.marketing;

import java.time.Instant;
import java.util.UUID;

/** Projection for the public homepage review showcase — joins review +
 * reviewer name + the product it was left on (via order_items snapshot,
 * so it survives even if the product/variant is later deleted). */
public interface ReviewShowcaseProjection {
    UUID getId();
    Integer getRating();
    String getComment();
    String getReplyText();
    Instant getCreatedAt();
    String getBuyerName();
    String getProductName();
}
