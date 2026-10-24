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

    /** A program aimed at a tier is open to that tier and every tier above it; buyers without a tier count as bronze. */
    static boolean allowsTier(PromotionProgram program, String userTier) {
        if (program.getTargetLoyaltyTier() == null) return true;
        return LoyaltyTier.fromCode(program.getTargetLoyaltyTier())
                .map(minimum -> LoyaltyTier.ofUser(userTier).atLeast(minimum))
                .orElse(false);
    }

    /** Product types a voucher is limited to — empty means every product. */
    static boolean coversProductType(Voucher voucher, String productType) {
        return voucher.getTargetProductTypes().isEmpty()
                || (productType != null && voucher.getTargetProductTypes().contains(productType));
    }
}
