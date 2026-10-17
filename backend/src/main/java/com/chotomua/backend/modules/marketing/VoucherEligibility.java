package com.chotomua.backend.modules.marketing;

import java.time.OffsetDateTime;

final class VoucherEligibility {

    private VoucherEligibility() {
    }

    static boolean isActive(Voucher voucher, PromotionProgram program, OffsetDateTime now) {
        return !now.isBefore(program.getStartAt())
                && now.isBefore(program.getEndAt())
                && (voucher.getExpiresAt() == null || now.isBefore(voucher.getExpiresAt()));
    }

    static boolean allowsTier(PromotionProgram program, String tier) {
        return program.getTargetLoyaltyTier() == null
                || (tier != null && program.getTargetLoyaltyTier().equalsIgnoreCase(tier));
    }
}
