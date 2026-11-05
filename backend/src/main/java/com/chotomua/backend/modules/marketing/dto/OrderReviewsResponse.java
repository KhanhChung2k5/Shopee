package com.chotomua.backend.modules.marketing.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The buyer's reviews on one order: until when they can review or change them ({@code deadline}, null while the
 * order is not delivered) and, for each line, its review if any and what the buyer can do with it now.
 */
public record OrderReviewsResponse(Instant deadline, List<Line> lines) {
    public record Line(UUID orderItemId, ReviewResponse review, boolean canReview, boolean canEdit, String blockedReason) {
    }
}
