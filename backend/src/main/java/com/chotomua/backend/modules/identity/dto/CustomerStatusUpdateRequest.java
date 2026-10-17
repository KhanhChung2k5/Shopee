package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.Pattern;

public record CustomerStatusUpdateRequest(
        @Pattern(regexp = "active|locked|deleted", message = "status phải là active/locked/deleted") String status
) {
}
