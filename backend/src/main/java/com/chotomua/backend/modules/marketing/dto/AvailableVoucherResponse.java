package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.PromotionProgram;
import com.chotomua.backend.modules.marketing.Voucher;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AvailableVoucherResponse(UUID id, String code, String type, BigDecimal value,
                                       String programName, OffsetDateTime endsAt) {
    public static AvailableVoucherResponse from(Voucher voucher, PromotionProgram program) {
        OffsetDateTime endsAt = voucher.getExpiresAt() == null || program.getEndAt().isBefore(voucher.getExpiresAt())
                ? program.getEndAt() : voucher.getExpiresAt();
        return new AvailableVoucherResponse(voucher.getId(), voucher.getCode(), voucher.getType(),
                voucher.getValue(), program.getName(), endsAt);
    }
}
