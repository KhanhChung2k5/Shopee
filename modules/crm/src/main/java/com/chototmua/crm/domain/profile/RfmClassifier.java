package com.chototmua.crm.domain.profile;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Chấm R, F, M trên thang 1–5 rồi xếp một trong năm nhóm.
 * Champions được xét trước; nhóm sau loại phần đã khớp nhóm trước.
 * Bộ điểm không rơi vào năm nhóm thì nhận {@code other}.
 */
public final class RfmClassifier {

    public static final String CHAMPIONS = "champions";
    public static final String LOYAL = "loyal";
    public static final String POTENTIAL = "potential";
    public static final String AT_RISK = "at_risk";
    public static final String LOST = "lost";
    public static final String OTHER = "other";

    public static final Set<String> LABELS = Set.of(CHAMPIONS, LOYAL, POTENTIAL, AT_RISK, LOST, OTHER);

    private RfmClassifier() {
    }

    /**
     * @param daysSinceLastPurchase số ngày từ lần giao gần nhất; {@code null} nếu chưa có đơn
     * @param orderCount số đơn đã giao
     * @param monetary tổng tiền các đơn đã giao (không dùng LTV dự báo)
     */
    public static String segment(Integer daysSinceLastPurchase, int orderCount, BigDecimal monetary) {
        int recency = recencyScore(daysSinceLastPurchase);
        int frequency = frequencyScore(orderCount);
        int money = monetaryScore(monetary);
        if (in(recency, 4, 5) && in(frequency, 4, 5) && in(money, 4, 5)) {
            return CHAMPIONS;
        }
        if (in(recency, 2, 5) && in(frequency, 3, 5) && in(money, 3, 5)) {
            return LOYAL;
        }
        if (in(recency, 1, 2) && in(frequency, 3, 5) && in(money, 3, 5)) {
            return AT_RISK;
        }
        if (in(recency, 3, 5) && in(frequency, 1, 3) && in(money, 1, 3)) {
            return POTENTIAL;
        }
        if (in(recency, 1, 2) && in(frequency, 1, 2) && in(money, 1, 2)) {
            return LOST;
        }
        return OTHER;
    }

    /** 0–30 ngày = 5, 31–60 = 4, 61–90 = 3, 91–180 = 2, lâu hơn hoặc chưa mua = 1. */
    public static int recencyScore(Integer daysSinceLastPurchase) {
        if (daysSinceLastPurchase == null || daysSinceLastPurchase > 180) {
            return 1;
        }
        if (daysSinceLastPurchase <= 30) {
            return 5;
        }
        if (daysSinceLastPurchase <= 60) {
            return 4;
        }
        if (daysSinceLastPurchase <= 90) {
            return 3;
        }
        return 2;
    }

    /** 0–1 đơn = 1, 2 đơn = 2, 3–4 = 3, 5–7 = 4, từ 8 đơn = 5. */
    public static int frequencyScore(int orderCount) {
        if (orderCount <= 1) {
            return 1;
        }
        if (orderCount == 2) {
            return 2;
        }
        if (orderCount <= 4) {
            return 3;
        }
        if (orderCount <= 7) {
            return 4;
        }
        return 5;
    }

    /** Dưới 500 nghìn = 1, dưới 1,5 triệu = 2, dưới 4 triệu = 3, dưới 8 triệu = 4, còn lại = 5. */
    public static int monetaryScore(BigDecimal monetary) {
        BigDecimal amount = monetary == null ? BigDecimal.ZERO : monetary;
        if (amount.compareTo(new BigDecimal("500000")) < 0) {
            return 1;
        }
        if (amount.compareTo(new BigDecimal("1500000")) < 0) {
            return 2;
        }
        if (amount.compareTo(new BigDecimal("4000000")) < 0) {
            return 3;
        }
        if (amount.compareTo(new BigDecimal("8000000")) < 0) {
            return 4;
        }
        return 5;
    }

    private static boolean in(int score, int low, int high) {
        return score >= low && score <= high;
    }
}
