package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConversationDetailResponse(
        UUID id,
        String code,
        UUID userId,
        String customerName,
        String type,
        String channelLabel,
        String topic,
        String topicLabel,
        String status,
        String statusLabel,
        String priority,
        UUID orderId,
        Instant openedAt,
        Instant lastMessageAt,
        Instant slaDueAt,
        String slaState,
        boolean agentOnline,
        String mode,
        String typingName,
        Integer csatScore,
        UUID assigneeId,
        String assigneeName,
        List<ConversationMessageResponse> messages,
        List<AssignmentResponse> assignments,
        ConversationCustomerResponse customer
) {
}
