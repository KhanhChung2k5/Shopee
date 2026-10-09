package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.Order;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrderSummaryResponse(
        UUID id,
        BigDecimal totalAmount,
        String status,
        String shipmentStatus,
        long itemCount,
        OffsetDateTime createdAt
) {
    public static OrderSummaryResponse from(Order order, long itemCount) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getShipmentStatus(),
                itemCount,
                order.getCreatedAt()
        );
    }
}
