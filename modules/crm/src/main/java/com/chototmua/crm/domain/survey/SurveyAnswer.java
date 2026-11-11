package com.chototmua.crm.domain.survey;

import java.util.UUID;

/** Một câu trả lời trong phiếu khách đã nộp. */
public record SurveyAnswer(
        UUID id,
        UUID responseId,
        UUID questionId,
        String answerText
) {
}
