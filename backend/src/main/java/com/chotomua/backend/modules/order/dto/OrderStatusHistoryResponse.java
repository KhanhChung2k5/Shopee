package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.OrderStatusHistory;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrderStatusHistoryResponse(
        UUID id,
        String status,
        UUID changedBy,
        String changedByType,
        String reason,
        OffsetDateTime changedAt
) {
    public static OrderStatusHistoryResponse from(OrderStatusHistory history) {
        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getStatus(),
                history.getChangedBy(),
                history.getChangedByType(),
                history.getReason(),
                history.getChangedAt()
        );
    }
}
