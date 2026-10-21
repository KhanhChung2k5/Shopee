package com.chototmua.crm.domain.recommendation;

/**
 * Lý do gợi ý — thứ tự ưu tiên khi gộp: máy→tay cầm, máy+tay cầm→đĩa,
 * đĩa cùng thể loại, mua chung; khách chưa mua dùng bán chạy quý.
 */
public enum RecommendationReason {
    NEW_CUSTOMER_BEST_SELLER("bán chạy quý gần nhất"),
    ACCESSORY_NEEDS_CONTROLLER("bổ sung tay cầm"),
    CONSOLE_NEEDS_GAME_DISC("bổ sung đĩa game"),
    SAME_GENRE_GAME_DISC("đĩa cùng thể loại"),
    CO_PURCHASE("thường mua cùng");

    private final String label;

    RecommendationReason(String label) {
        this.label = label;
    }

    /** Nhãn tiếng Việt trên API / nội dung hộp thư. */
    public String label() {
        return label;
    }
}
