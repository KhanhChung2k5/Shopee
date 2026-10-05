package com.chototmua.crm.application.report;

import java.time.LocalDate;
import java.time.Period;

/**
 * Nhóm tuổi đề bài / Jira KAN-267. Tính từ ngày sinh trên hồ sơ, không bảng phụ.
 */
public enum AgeBucket {

    UNDER_18("UNDER_18", "Dưới 18"),
    FROM_18_TO_24("18–24", "18–24"),
    FROM_25_TO_34("25–34", "25–34"),
    FROM_35_TO_44("35–44", "35–44"),
    FROM_45("45+", "45+"),
    UNKNOWN("UNKNOWN", "Không rõ");

    private final String code;
    private final String label;

    AgeBucket(String code, String label) {
        this.code = code;
        this.label = label;
    }

    /** Mã nhóm tuổi (UNDER_18, 18–24, …). */
    public String code() {
        return code;
    }

    /** Nhãn tiếng Việt trên biểu đồ. */
    public String label() {
        return label;
    }

    /** Phân nhóm theo tuổi tròn năm tại {@code today}. Thiếu ngày sinh → không rõ. */
    public static AgeBucket fromDob(LocalDate dob, LocalDate today) {
        if (dob == null || today == null) {
            return UNKNOWN;
        }
        int age = Period.between(dob, today).getYears();
        if (age < 18) {
            return UNDER_18;
        }
        if (age <= 24) {
            return FROM_18_TO_24;
        }
        if (age <= 34) {
            return FROM_25_TO_34;
        }
        if (age <= 44) {
            return FROM_35_TO_44;
        }
        return FROM_45;
    }
}
