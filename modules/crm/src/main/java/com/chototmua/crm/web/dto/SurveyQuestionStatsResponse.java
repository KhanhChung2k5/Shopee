package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * Thống kê một câu. Trắc nghiệm và điểm nằm ở {@code buckets}.
 * Câu tự luận nằm ở {@code texts}.
 */
public record SurveyQuestionStatsResponse(
        UUID questionId,
        String questionText,
        String answerType,
        int answerCount,
        List<SurveyAnswerBucketResponse> buckets,
        List<String> texts
) {
}
