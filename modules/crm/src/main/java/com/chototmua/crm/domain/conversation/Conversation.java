package com.chototmua.crm.domain.conversation;

import java.time.Instant;
import java.util.UUID;

/**
 * Một hội thoại duy nhất cho cả ticket và live chat.
 * Không tách bảng {@code SupportTicket}.
 */
public record Conversation(
        UUID id,
        UUID userId,
        UUID orderId,
        String type,
        String channel,
        String topic,
        String status,
        String priority,
        Instant openedAt,
        Instant lastMessageAt
) {

    public Conversation withLastMessageAt(Instant when) {
        return new Conversation(id, userId, orderId, type, channel, topic, status, priority, openedAt, when);
    }

    public Conversation updated(String nextType, String nextStatus, String nextPriority) {
        return new Conversation(
                id,
                userId,
                orderId,
                nextType == null ? type : nextType,
                channel,
                topic,
                nextStatus == null ? status : nextStatus,
                nextPriority == null ? priority : nextPriority,
                openedAt,
                lastMessageAt);
    }
}
