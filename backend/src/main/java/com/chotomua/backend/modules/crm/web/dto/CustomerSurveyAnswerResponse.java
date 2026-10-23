package com.chotomua.backend.modules.crm.web.dto;

import java.util.UUID;

/** Câu khách đã nộp, để mở lại phiếu ở chế độ chỉ xem. */
public record CustomerSurveyAnswerResponse(
        UUID questionId,
        String answerText
) {
}
