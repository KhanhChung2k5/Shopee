package com.chototmua.crm.domain.audit;

import java.time.Instant;
import java.util.UUID;

/**
 * Một dòng nhật ký thao tác: ai làm gì, trên đường dẫn nào, kết quả ra sao.
 * {@code outcome} là {@code success} hoặc {@code failed}.
 */
public record OperationLog(
        UUID id,
        UUID actorId,
        String actorLogin,
        String actorLabel,
        String department,
        String action,
        String httpMethod,
        String path,
        int statusCode,
        String outcome,
        Instant occurredAt
) {
}
