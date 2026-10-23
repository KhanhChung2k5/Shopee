package com.chotomua.backend.modules.crm.web.dto;

import java.util.UUID;

public record SupportAgentResponse(
        UUID userId,
        String fullName,
        String department,
        String roleLabel
) {
}
