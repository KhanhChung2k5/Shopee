package com.chototmua.crm.port.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Đơn đã giao, dùng tính lại hồ sơ CRM / điểm hài lòng sau mua.
 * Cố ý không có trạng thái khác — CRM không được neo {@code COMPLETED}.
 */
public record DeliveredOrderView(
        UUID orderId,
        UUID userId,
        BigDecimal totalAmount,
        Instant deliveredAt,
        List<DeliveredOrderLine> lines
) {
}
