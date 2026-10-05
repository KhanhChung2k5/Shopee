package com.chototmua.crm.domain.survey;

import java.util.List;
import java.util.UUID;

/**
 * Một câu trong phiếu. {@code answerType}: {@code text} | {@code rating} | {@code multiple_choice}.
 * Schema không có bảng lựa chọn — {@code options} của trắc nghiệm được mã hóa vào {@code question_text}.
 */
public record SurveyQuestion(
        UUID id,
        UUID surveyId,
        String questionText,
        String answerType,
        List<String> options,
        int sortOrder
) {
    public static final String TEXT = "text";
    public static final String RATING = "rating";
    public static final String MULTIPLE_CHOICE = "multiple_choice";

    public SurveyQuestion {
        options = options == null ? List.of() : List.copyOf(options);
    }
}
