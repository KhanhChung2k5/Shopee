package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

public record ConversationHistoryItem(
        UUID id,
        String code,
        String status,
        String statusLabel,
        String topicLabel,
        String channelLabel,
        Instant lastMessageAt
) {
}
