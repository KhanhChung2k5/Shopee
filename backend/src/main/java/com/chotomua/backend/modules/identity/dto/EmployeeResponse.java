package com.chotomua.backend.modules.identity.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EmployeeResponse(
        UUID id,
        UUID userId,
        String email,
        String fullName,
        String department,
        String position,
        BigDecimal baseSalary,
        OffsetDateTime hiredAt
) {
    public static EmployeeResponse from(com.chotomua.backend.modules.identity.Employee employee) {
        var user = employee.getUser();
        return new EmployeeResponse(
                employee.getId(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                employee.getDepartment(),
                employee.getPosition(),
                employee.getBaseSalary(),
                employee.getHiredAt()
        );
    }
}
