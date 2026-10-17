package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record EmployeeUpdateRequest(
        @NotBlank String department,
        String position,
        BigDecimal baseSalary
) {
}
