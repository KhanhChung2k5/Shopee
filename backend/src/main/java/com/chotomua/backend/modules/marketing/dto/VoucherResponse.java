package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.Voucher;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record VoucherResponse(UUID id, UUID promotionProgramId, String code, String type,
                              BigDecimal value, OffsetDateTime expiresAt) {
    public static VoucherResponse from(Voucher voucher) {
        return new VoucherResponse(voucher.getId(), voucher.getPromotionProgramId(), voucher.getCode(),
                voucher.getType(), voucher.getValue(), voucher.getExpiresAt());
    }
}
