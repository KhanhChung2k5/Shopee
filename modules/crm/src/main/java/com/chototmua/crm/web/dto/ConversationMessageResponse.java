package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

public record ConversationMessageResponse(
        UUID id,
        UUID senderId,
        String senderName,
        String senderRole,
        String kind,
        String content,
        Integer score,
        Instant sentAt,
        String side
) {
}
