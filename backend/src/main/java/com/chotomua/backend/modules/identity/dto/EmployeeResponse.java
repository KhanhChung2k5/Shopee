package com.chotomua.backend.modules.identity.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EmployeeResponse(
        UUID id,
        UUID userId,
        String department,
        String position,
        BigDecimal baseSalary,
        OffsetDateTime hiredAt
) {
    public static EmployeeResponse from(com.chotomua.backend.modules.identity.Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getUser().getId(),
                employee.getDepartment(),
                employee.getPosition(),
                employee.getBaseSalary(),
                employee.getHiredAt()
        );
    }
}
