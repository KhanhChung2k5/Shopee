package com.chotomua.backend.modules.crm.domain.notification;

import java.time.Instant;
import java.util.UUID;

/**
 * Thông báo trong ứng dụng. {@code referenceType} là {@code campaign} hoặc {@code survey}.
 * {@code campaignId}: chiến dịch đã gửi thư (nếu có); {@code orderId}: đơn mà thư khảo sát sau mua hàng hỏi tới.
 * Không có thực thể voucher hay flash sale.
 */
public record AppNotification(
        UUID id,
        UUID userId,
        String referenceType,
        UUID referenceId,
        String channel,
        String content,
        String status,
        Instant sentAt,
        UUID campaignId,
        UUID orderId
) {
    /** A notification not sent by a campaign and not about one order (a survey sent straight to the inbox). */
    public AppNotification(UUID id, UUID userId, String referenceType, UUID referenceId, String channel,
                           String content, String status, Instant sentAt) {
        this(id, userId, referenceType, referenceId, channel, content, status, sentAt, null, null);
    }
}
