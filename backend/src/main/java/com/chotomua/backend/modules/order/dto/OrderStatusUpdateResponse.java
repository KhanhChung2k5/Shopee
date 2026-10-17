package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.OrderStatusHistory;
import java.util.UUID;

public record OrderStatusUpdateResponse(
        UUID orderId,
        String previousStatus,
        String status,
        OrderStatusHistoryResponse change
) {
    public static OrderStatusUpdateResponse from(
            UUID orderId,
            String previousStatus,
            String status,
            OrderStatusHistory history
    ) {
        return new OrderStatusUpdateResponse(
                orderId,
                previousStatus,
                status,
                OrderStatusHistoryResponse.from(history)
        );
    }
}
