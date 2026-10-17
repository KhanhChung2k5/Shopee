package com.chotomua.backend.modules.identity.dto;

import com.chotomua.backend.modules.identity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Admin-facing view of a buyer account. totalOrders/ltv come straight off the
 * User row and are honestly 0 for every real account today — nothing writes
 * to them yet because the Order module (Phase 2+) hasn't been built.
 */
public record CustomerResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        String gender,
        LocalDate dob,
        String status,
        Integer totalOrders,
        BigDecimal ltv
) {
    public static CustomerResponse from(User user) {
        return new CustomerResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getGender(),
                user.getDob(),
                user.getStatus(),
                user.getTotalOrders(),
                user.getLtv()
        );
    }
}
