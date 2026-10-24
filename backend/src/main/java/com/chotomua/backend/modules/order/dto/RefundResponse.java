package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.RefundReturn;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One refund, with the product line and (for staff) the buyer it belongs to. */
public record RefundResponse(
        UUID id,
        UUID orderId,
        UUID orderItemId,
        String kind,
        String productName,
        Integer quantity,
        String reason,
        String status,
        BigDecimal refundAmount,
        String bankName,
        String bankAccountNo,
        String bankAccountName,
        String staffNote,
        String transferRef,
        OffsetDateTime requestedAt,
        OffsetDateTime handledAt,
        OffsetDateTime refundedAt,
        String customerName,
        String customerEmail
) {
    public static RefundResponse from(RefundReturn refund, String productName, Integer quantity,
                                      String customerName, String customerEmail) {
        return new RefundResponse(refund.getId(), refund.getOrderId(), refund.getOrderItemId(), refund.getKind(),
                productName, quantity, refund.getReason(), refund.getStatus(), refund.getRefundAmount(),
                refund.getBankName(), refund.getBankAccountNo(), refund.getBankAccountName(), refund.getStaffNote(),
                refund.getTransferRef(), refund.getRequestedAt(), refund.getHandledAt(), refund.getRefundedAt(),
                customerName, customerEmail);
    }
}
