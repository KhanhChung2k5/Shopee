package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.Voucher;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** {@code usedCount} = orders (not cancelled) that used the code. */
public record VoucherResponse(UUID id, UUID promotionProgramId, String code, String type,
                              BigDecimal value, OffsetDateTime expiresAt, List<String> targetProductTypes,
                              BigDecimal minOrderAmount, BigDecimal maxDiscountAmount, Integer usageLimit,
                              boolean newCustomersOnly, long usedCount) {
    public static VoucherResponse from(Voucher voucher) {
        return from(voucher, 0);
    }

    public static VoucherResponse from(Voucher voucher, long usedCount) {
        return new VoucherResponse(voucher.getId(), voucher.getPromotionProgramId(), voucher.getCode(),
                voucher.getType(), voucher.getValue(), voucher.getExpiresAt(), voucher.getTargetProductTypes(),
                voucher.getMinOrderAmount(), voucher.getMaxDiscountAmount(), voucher.getUsageLimit(),
                voucher.isNewCustomersOnly(), usedCount);
    }
}
