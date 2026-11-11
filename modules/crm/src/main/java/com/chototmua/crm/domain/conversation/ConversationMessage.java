package com.chototmua.crm.domain.conversation;

import java.time.Instant;
import java.util.UUID;

/**
 * Một tin trong hội thoại.
 * {@code kind}: public (khách và agent thấy), internal (chỉ agent), bot, system, csat.
 */
public record ConversationMessage(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String kind,
        String content,
        Integer score,
        Instant sentAt
) {
}
