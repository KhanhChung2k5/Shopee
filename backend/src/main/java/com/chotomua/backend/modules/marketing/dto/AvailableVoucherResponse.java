package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.PromotionProgram;
import com.chotomua.backend.modules.marketing.Voucher;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** A voucher the buyer can use right now, with the conditions to show in the voucher wallet. */
public record AvailableVoucherResponse(UUID id, String code, String type, BigDecimal value,
                                       String programName, OffsetDateTime endsAt,
                                       String minLoyaltyTier, List<String> targetProductTypes) {
    public static AvailableVoucherResponse from(Voucher voucher, PromotionProgram program) {
        OffsetDateTime endsAt = voucher.getExpiresAt() == null || program.getEndAt().isBefore(voucher.getExpiresAt())
                ? program.getEndAt() : voucher.getExpiresAt();
        return new AvailableVoucherResponse(voucher.getId(), voucher.getCode(), voucher.getType(),
                voucher.getValue(), program.getName(), endsAt,
                program.getTargetLoyaltyTier(), voucher.getTargetProductTypes());
    }
}
