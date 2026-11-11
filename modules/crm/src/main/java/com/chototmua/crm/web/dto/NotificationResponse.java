package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

/** Một dòng hộp thư in-app. */
public record NotificationResponse(
        UUID id,
        UUID userId,
        String referenceType,
        UUID referenceId,
        String channel,
        String content,
        String status,
        Instant sentAt
) {
}
