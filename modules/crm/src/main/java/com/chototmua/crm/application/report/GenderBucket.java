package com.chototmua.crm.application.report;

import java.util.Locale;

/**
 * Nhóm giới tính báo cáo. Thiếu hoặc giá trị lạ → {@code unknown}.
 */
public enum GenderBucket {

    MALE("male", "Nam"),
    FEMALE("female", "Nữ"),
    UNKNOWN("unknown", "Không rõ");

    private final String code;
    private final String label;

    GenderBucket(String code, String label) {
        this.code = code;
        this.label = label;
    }

    /** Mã API: male / female / unknown. */
    public String code() {
        return code;
    }

    /** Nhãn tiếng Việt trên biểu đồ. */
    public String label() {
        return label;
    }

    /** Map giá trị hồ sơ {@code male}/{@code female}; khác → unknown. */
    public static GenderBucket fromGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return UNKNOWN;
        }
        return switch (gender.trim().toLowerCase(Locale.ROOT)) {
            case "male" -> MALE;
            case "female" -> FEMALE;
            default -> UNKNOWN;
        };
    }
}
