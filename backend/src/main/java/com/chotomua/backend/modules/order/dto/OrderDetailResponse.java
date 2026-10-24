package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.Order;
import com.chotomua.backend.modules.order.OrderItem;
import com.chotomua.backend.modules.order.OrderStatusHistory;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderDetailResponse(
        UUID id,
        UUID addressId,
        String shippingAddressSnapshot,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal shippingFeeAmount,
        BigDecimal totalAmount,
        String status,
        UUID warehouseId,
        String shippingProviderName,
        String trackingNo,
        String shipmentStatus,
        OffsetDateTime createdAt,
        List<OrderItemResponse> items,
        List<OrderStatusHistoryResponse> statusHistory,
        OrderCustomerResponse customer,
        OrderPaymentResponse payment,
        List<RefundResponse> refunds
) {
    public static OrderDetailResponse from(
            Order order,
            List<OrderItem> items,
            List<OrderStatusHistory> history
    ) {
        return from(order, items.stream().map(OrderItemResponse::from).toList(), history, null);
    }

    public static OrderDetailResponse from(
            Order order,
            List<OrderItemResponse> items,
            List<OrderStatusHistory> history,
            OrderCustomerResponse customer
    ) {
        return from(order, items, history, customer, null);
    }

    public static OrderDetailResponse from(
            Order order,
            List<OrderItemResponse> items,
            List<OrderStatusHistory> history,
            OrderCustomerResponse customer,
            OrderPaymentResponse payment
    ) {
        return from(order, items, history, customer, payment, List.of());
    }

    public static OrderDetailResponse from(
            Order order,
            List<OrderItemResponse> items,
            List<OrderStatusHistory> history,
            OrderCustomerResponse customer,
            OrderPaymentResponse payment,
            List<RefundResponse> refunds
    ) {
        return new OrderDetailResponse(
                order.getId(),
                order.getAddressId(),
                order.getShippingAddressSnapshot(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getShippingFeeAmount(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getWarehouseId(),
                order.getShippingProviderName(),
                order.getTrackingNo(),
                order.getShipmentStatus(),
                order.getCreatedAt(),
                items,
                history.stream().map(OrderStatusHistoryResponse::from).toList(),
                customer,
                payment,
                refunds
        );
    }
}
