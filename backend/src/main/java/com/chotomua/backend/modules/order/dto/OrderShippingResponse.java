package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.Order;
import java.util.UUID;

public record OrderShippingResponse(
        UUID orderId,
        UUID employeeId,
        UUID warehouseId,
        String shippingProviderName,
        String trackingNo,
        String shipmentStatus,
        String orderStatus
) {
    public static OrderShippingResponse from(Order order) {
        return new OrderShippingResponse(
                order.getId(),
                order.getEmployeeId(),
                order.getWarehouseId(),
                order.getShippingProviderName(),
                order.getTrackingNo(),
                order.getShipmentStatus(),
                order.getStatus()
        );
    }
}
