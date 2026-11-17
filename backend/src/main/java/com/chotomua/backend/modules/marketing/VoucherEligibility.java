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

    /**
     * Whether a voucher discounts a cart line: it does when nothing is targeted, or when the line's product type OR
     * the product itself is one the voucher names.
     */
    static boolean covers(Voucher voucher, String productType, java.util.UUID productId) {
        return voucher.coversEveryProduct()
                || (productType != null && voucher.getTargetProductTypes().contains(productType))
                || (productId != null && voucher.getTargetProductIds().contains(productId));
    }

    /** Whether this buyer may still use the code: {@code usedByBuyer} orders already used it (null limit = unlimited). */
    static boolean buyerHasUsesLeft(Voucher voucher, long usedByBuyer) {
        return voucher.getPerCustomerLimit() == null || usedByBuyer < voucher.getPerCustomerLimit();
    }
}
