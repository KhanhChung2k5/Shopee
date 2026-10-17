package com.chotomua.backend.modules.identity.dto;

import java.time.LocalDate;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String phone,
        String fullName,
        String avatarUrl,
        String gender,
        LocalDate dob,
        String role
) {
    public static UserProfileResponse from(com.chotomua.backend.modules.identity.User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getPhone(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getGender(),
                user.getDob(),
                user.getRole()
        );
    }
}
