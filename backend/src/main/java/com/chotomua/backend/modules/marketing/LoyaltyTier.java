package com.chotomua.backend.modules.marketing;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Membership tiers, ranked by lifetime loyalty points (1 point per 10,000đ of delivered orders, see
 * {@link LoyaltyAwardService}). Stored in {@code users.loyalty_tier} by code; a promotion program's
 * {@code target_loyalty_tier} means "this tier or higher". A buyer with no tier yet counts as BRONZE.
 */
public enum LoyaltyTier {
    BRONZE("bronze", "Đồng", 0),
    SILVER("silver", "Bạc", 500),
    GOLD("gold", "Vàng", 2_000),
    DIAMOND("diamond", "Kim cương", 5_000);

    private final String code;
    private final String label;
    private final long minPoints;

    LoyaltyTier(String code, String label, long minPoints) {
        this.code = code;
        this.label = label;
        this.minPoints = minPoints;
    }

    public String code() { return code; }
    public String label() { return label; }
    public long minPoints() { return minPoints; }

    public static LoyaltyTier forPoints(long lifetimePoints) {
        LoyaltyTier result = BRONZE;
        for (LoyaltyTier tier : values()) {
            if (lifetimePoints >= tier.minPoints) result = tier;
        }
        return result;
    }

    public static Optional<LoyaltyTier> fromCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(tier -> tier.code.equals(normalized)).findFirst();
    }

    /** The tier a buyer currently holds; anyone not ranked yet is BRONZE. */
    public static LoyaltyTier ofUser(String storedCode) {
        return fromCode(storedCode).orElse(BRONZE);
    }

    public boolean atLeast(LoyaltyTier other) {
        return ordinal() >= other.ordinal();
    }
}
