package com.chototmua.crm.domain.survey;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Phiếu khách đã nộp. Khớp bảng {@code survey_responses}.
 * {@code orderId} tùy chọn khi khảo sát gắn một đơn đã giao.
 */
public record SurveySubmission(
        UUID id,
        UUID surveyId,
        UUID userId,
        UUID orderId,
        Instant submittedAt,
        List<SurveyAnswer> answers
) {
    public SurveySubmission {
        answers = answers == null ? List.of() : List.copyOf(answers);
    }
}
