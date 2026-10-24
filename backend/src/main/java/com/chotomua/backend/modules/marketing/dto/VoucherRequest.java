package com.chotomua.backend.modules.marketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A voucher always belongs to one promotion program (which carries its dates and target loyalty tier).
 * {@code targetProductTypes} limits it to game_disc / controller / accessory; null or empty = every product.
 */
public record VoucherRequest(
        @NotNull UUID promotionProgramId,
        @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9_-]+") String code,
        @NotBlank @Pattern(regexp = "percentage|fixed_amount") String type,
        @NotNull BigDecimal value,
        OffsetDateTime expiresAt,
        List<String> targetProductTypes
) {
    public VoucherRequest(UUID promotionProgramId, String code, String type, BigDecimal value, OffsetDateTime expiresAt) {
        this(promotionProgramId, code, type, value, expiresAt, List.of());
    }
}
