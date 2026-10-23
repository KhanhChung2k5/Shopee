package com.chotomua.backend.modules.crm.web.dto;

import java.util.UUID;

/** Khách trong phân khúc nhưng không nhận thông báo vì khóa hoặc đã xóa. */
public record SkippedRecipientResponse(UUID userId, String fullName, String status) {
}
