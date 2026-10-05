package com.chototmua.crm.domain.survey;

import java.time.Instant;
import java.util.UUID;

/**
 * Phiếu khảo sát. {@code status}: {@code draft} | {@code sent} | {@code closed}.
 * Khách chỉ nộp khi phiếu đã gửi.
 */
public record Survey(
        UUID id,
        UUID createdByEmployeeId,
        String title,
        String description,
        String status,
        Instant createdAt
) {
    public static final String DRAFT = "draft";
    public static final String SENT = "sent";
    public static final String CLOSED = "closed";
}
