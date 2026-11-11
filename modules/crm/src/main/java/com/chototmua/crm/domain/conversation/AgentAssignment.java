package com.chototmua.crm.domain.conversation;

import java.time.Instant;
import java.util.UUID;

/**
 * Lượt gán nhân viên xử lý. Bản ghi cũ giữ lại, chỉ một dòng {@code current}.
 * {@code employeeUserId} là mã người dùng (users.id); kho JDBC tự đổi sang employees.id.
 */
public record AgentAssignment(
        UUID id,
        UUID conversationId,
        UUID employeeUserId,
        boolean current,
        Instant assignedAt
) {
}
