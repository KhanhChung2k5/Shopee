package com.chotomua.backend.modules.order.dto;
import com.chotomua.backend.modules.order.RefundReturn;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
public record RefundResponse(UUID id, UUID orderItemId, String status, BigDecimal refundAmount, String reason, OffsetDateTime requestedAt) {
 public static RefundResponse from(RefundReturn value) { return new RefundResponse(value.getId(), value.getOrderItemId(), value.getStatus(), value.getRefundAmount(), value.getReason(), value.getRequestedAt()); }
}
