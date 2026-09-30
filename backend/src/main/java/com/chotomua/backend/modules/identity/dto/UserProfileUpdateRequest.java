package com.chotomua.backend.modules.identity.dto;

import java.time.LocalDate;

public record UserProfileUpdateRequest(
        String fullName,
        String avatarUrl,
        String gender,
        LocalDate dob
) {
}
