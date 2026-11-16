package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Phiếu khách được mời: câu hỏi và câu đã nộp nếu có. */
public record CustomerSurveySheetResponse(
        UUID id,
        String title,
        String description,
        String status,
        boolean submitted,
        List<SurveyQuestionResponse> questions,
        List<CustomerSurveyAnswerResponse> answers
) {
}
