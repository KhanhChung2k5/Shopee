package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(
        UUID id,
        UUID employeeId,
        String employeeName,
        String role,
        boolean current,
        Instant assignedAt
) {
}
