package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * Thống kê khảo sát.
 * {@code completionPercent} = số phiếu đã nộp / số thư mời đã gửi, nhân 100.
 */
public record SurveyStatsResponse(
        UUID surveyId,
        int invitedCount,
        int submittedCount,
        int completionPercent,
        List<SurveyQuestionStatsResponse> questions
) {
}
