package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record PromotionProgramRequest(
        @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9_-]+") String code,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 20) String programType,
        @Size(max = 50) String targetLoyaltyTier,
        @NotNull OffsetDateTime startAt,
        @NotNull OffsetDateTime endAt
) {
}
