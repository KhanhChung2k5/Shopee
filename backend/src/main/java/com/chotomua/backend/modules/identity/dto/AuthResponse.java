package com.chotomua.backend.modules.identity.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String role,
        String fullName
) {
}
