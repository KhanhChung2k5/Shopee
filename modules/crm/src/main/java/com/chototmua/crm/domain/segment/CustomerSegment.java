package com.chototmua.crm.domain.segment;

import java.time.Instant;
import java.util.UUID;

/**
 * Phân khúc khách — đầu vào campaign in-app, không phải voucher.
 * Giữ trong bộ nhớ đến khi map JPA bảng {@code CustomerSegment} của nhóm.
 */
public record CustomerSegment(
        UUID id,
        String name,
        SegmentRule rule,
        Instant createdAt
) {
}
