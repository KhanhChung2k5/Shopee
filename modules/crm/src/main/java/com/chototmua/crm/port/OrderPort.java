package com.chototmua.crm.port;

import com.chototmua.crm.port.dto.DeliveredOrderView;

import java.util.List;
import java.util.UUID;

/**
 * Cổng sang đơn hàng (nhóm C).
 * Không duyệt đổi trả, không đánh giá, không áp mã giảm — những việc đó không thuộc CRM.
 */
public interface OrderPort {

    /** True khi đơn thuộc đúng khách này (dùng khi mở hội thoại gắn đơn). */
    boolean existsOrder(UUID userId, UUID orderId);

    /** Chỉ đơn đã giao ({@code delivered}) — không dùng trạng thái {@code COMPLETED}. */
    List<DeliveredOrderView> listDeliveredOrders(UUID userId);
}
