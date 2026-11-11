package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

/** Một dòng hàng đợi trên bàn CSKH. */
public record ConversationSummaryResponse(
        UUID id,
        String code,
        UUID userId,
        String customerName,
        String type,
        String channelLabel,
        String topicLabel,
        String status,
        String statusLabel,
        String priority,
        String preview,
        Instant lastMessageAt,
        Instant slaDueAt,
        String slaState,
        UUID assigneeId,
        String assigneeName,
        boolean mine
) {
}
