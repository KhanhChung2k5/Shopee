package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

/** Một thành viên phân khúc trả về cho Admin. */
public record SegmentMemberResponse(
        UUID userId,
        String fullName,
        String status,
        Instant addedAt
) {
}
