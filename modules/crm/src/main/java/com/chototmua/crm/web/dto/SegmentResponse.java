package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Một phân khúc kèm thành viên vừa tính. */
public record SegmentResponse(
        UUID id,
        String name,
        Map<String, Object> ruleDefinition,
        int memberCount,
        List<SegmentMemberResponse> members,
        Instant createdAt,
        boolean locked
) {
}
