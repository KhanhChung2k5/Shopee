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
 * {@code targetProductTypes} (game_disc / controller / accessory) and {@code targetProductIds} (specific products)
 * limit which lines it discounts: a line is covered if its type OR its product is listed; both empty = every product.
 * {@code perCustomerLimit} = orders one buyer may use it on (null = unlimited per buyer).
 * {@code minOrderAmount}, {@code maxDiscountAmount} (percentage only) and {@code usageLimit} are optional;
 * {@code newCustomersOnly} keeps it for a buyer's first order.
 */
public record VoucherRequest(
        @NotNull UUID promotionProgramId,
        @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9_-]+") String code,
        @NotBlank @Pattern(regexp = "percentage|fixed_amount") String type,
        @NotNull BigDecimal value,
        OffsetDateTime expiresAt,
        List<String> targetProductTypes,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        Boolean newCustomersOnly,
        List<UUID> targetProductIds,
        Integer perCustomerLimit
) {
    /** Before product targeting and per-buyer limits: no products picked, once per buyer (the old rule). */
    public VoucherRequest(UUID promotionProgramId, String code, String type, BigDecimal value, OffsetDateTime expiresAt,
                          List<String> targetProductTypes, BigDecimal minOrderAmount, BigDecimal maxDiscountAmount,
                          Integer usageLimit, Boolean newCustomersOnly) {
        this(promotionProgramId, code, type, value, expiresAt, targetProductTypes, minOrderAmount, maxDiscountAmount,
                usageLimit, newCustomersOnly, List.of(), 1);
    }

    public VoucherRequest(UUID promotionProgramId, String code, String type, BigDecimal value, OffsetDateTime expiresAt) {
        this(promotionProgramId, code, type, value, expiresAt, List.of());
    }

    public VoucherRequest(UUID promotionProgramId, String code, String type, BigDecimal value, OffsetDateTime expiresAt,
                          List<String> targetProductTypes) {
        this(promotionProgramId, code, type, value, expiresAt, targetProductTypes, null, null, null, false);
    }
}
