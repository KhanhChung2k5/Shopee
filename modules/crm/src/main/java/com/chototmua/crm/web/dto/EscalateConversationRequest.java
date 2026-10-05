package com.chototmua.crm.web.dto;

import java.util.UUID;

/** Chuyển hội thoại sang nhân viên khác. {@code employeeId} là mã người dùng. */
public record EscalateConversationRequest(UUID employeeId) {
}
