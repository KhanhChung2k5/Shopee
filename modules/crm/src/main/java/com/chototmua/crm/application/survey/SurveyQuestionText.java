package com.chototmua.crm.application.survey;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * Cột {@code survey_questions.question_text} không có chỗ riêng cho lựa chọn.
 * Câu {@code multiple_choice} lưu JSON {@code {"text","options"}}; câu khác lưu nguyên văn.
 * Điểm mở: teammate thêm cột/bảng option thì bỏ lớp mã hóa này.
 */
public final class SurveyQuestionText {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** Tiện ích tĩnh — không tạo đối tượng. */
    private SurveyQuestionText() {
    }

    /** Trắc nghiệm: JSON text + options; loại khác: nguyên văn câu hỏi. */
    public static String encode(String questionText, String answerType, List<String> options) {
        if (!"multiple_choice".equals(answerType)) {
            return questionText;
        }
        try {
            return JSON.writeValueAsString(new Payload(questionText, options));
        } catch (Exception exception) {
            throw new IllegalStateException("Không mã hóa được lựa chọn câu hỏi.", exception);
        }
    }

    /** Tách nội dung câu và lựa chọn; JSON hỏng thì coi cả cột là text. */
    public static Decoded decode(String stored, String answerType) {
        if (!"multiple_choice".equals(answerType) || stored == null || !stored.startsWith("{")) {
            return new Decoded(stored, List.of());
        }
        try {
            Payload payload = JSON.readValue(stored, Payload.class);
            List<String> options = payload.options() == null ? List.of() : payload.options();
            String text = payload.text() == null ? stored : payload.text();
            return new Decoded(text, options);
        } catch (Exception exception) {
            return new Decoded(stored, List.of());
        }
    }

    /** Câu hỏi hiển thị và danh sách lựa chọn (trắc nghiệm). */
    public record Decoded(String questionText, List<String> options) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Payload(String text, List<String> options) {
    }
}
