package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record EmployeeStatusRequest(
        @NotNull(message = "Thiếu trạng thái")
        @Pattern(regexp = "active|locked", message = "status phải là active/locked") String status
) {
}
