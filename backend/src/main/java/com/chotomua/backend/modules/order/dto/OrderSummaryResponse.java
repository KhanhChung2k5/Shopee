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
        OffsetDateTime createdAt,
        OrderCustomerResponse customer,
        /** cod | bank_transfer; null on orders placed before payments were recorded. */
        String paymentMethod,
        String paymentStatus,
        /** Money already transferred back to the buyer (returns, cancelled paid orders). */
        BigDecimal refundedAmount
) {
    public static OrderSummaryResponse from(Order order, long itemCount) {
        return from(order, itemCount, null);
    }

    public static OrderSummaryResponse from(Order order, long itemCount, OrderCustomerResponse customer) {
        return from(order, itemCount, customer, null, null, BigDecimal.ZERO);
    }

    public static OrderSummaryResponse from(Order order, long itemCount, OrderCustomerResponse customer,
                                            String paymentMethod, String paymentStatus, BigDecimal refundedAmount) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getShipmentStatus(),
                itemCount,
                order.getCreatedAt(),
                customer,
                paymentMethod,
                paymentStatus,
                refundedAmount
        );
    }
}
