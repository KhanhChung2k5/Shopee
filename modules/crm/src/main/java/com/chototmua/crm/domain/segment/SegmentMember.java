package com.chototmua.crm.domain.segment;

import java.time.Instant;
import java.util.UUID;

/** Một khách đang thuộc phân khúc. Khóa chính kép {@code segmentId} + {@code userId}. */
public record SegmentMember(
        UUID segmentId,
        UUID userId,
        Instant addedAt
) {
}
