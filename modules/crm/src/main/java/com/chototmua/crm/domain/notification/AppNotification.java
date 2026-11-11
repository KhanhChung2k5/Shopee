package com.chototmua.crm.domain.notification;

import java.time.Instant;
import java.util.UUID;

/**
 * Thông báo trong ứng dụng. {@code referenceType} là {@code campaign} hoặc {@code survey}.
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
        Instant sentAt
) {
}
