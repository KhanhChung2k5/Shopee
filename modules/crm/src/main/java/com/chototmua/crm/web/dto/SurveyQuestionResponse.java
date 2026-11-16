package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Một câu hỏi. {@code options} chỉ có khi {@code answerType} là {@code multiple_choice}. */
public record SurveyQuestionResponse(
        UUID id,
        String questionText,
        String answerType,
        List<String> options,
        int sortOrder
) {
}
