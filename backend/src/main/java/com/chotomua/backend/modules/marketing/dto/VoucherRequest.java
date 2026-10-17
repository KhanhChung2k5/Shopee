package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record VoucherRequest(
        @NotNull UUID promotionProgramId,
        @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9_-]+") String code,
        @NotBlank @Pattern(regexp = "percentage|fixed_amount") String type,
        @NotNull BigDecimal value,
        OffsetDateTime expiresAt
) {
}
