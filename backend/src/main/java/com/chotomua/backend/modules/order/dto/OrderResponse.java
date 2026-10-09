package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.Order;
import com.chotomua.backend.modules.order.OrderItem;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        UUID addressId,
        String shippingAddressSnapshot,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal shippingFeeAmount,
        BigDecimal totalAmount,
        String status,
        String shipmentStatus,
        OffsetDateTime createdAt,
        List<OrderItemResponse> items
) {
    public static OrderResponse from(Order order, List<OrderItem> items) {
        return new OrderResponse(
                order.getId(),
                order.getAddressId(),
                order.getShippingAddressSnapshot(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getShippingFeeAmount(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getShipmentStatus(),
                order.getCreatedAt(),
                items.stream().map(OrderItemResponse::from).toList()
        );
    }
}
