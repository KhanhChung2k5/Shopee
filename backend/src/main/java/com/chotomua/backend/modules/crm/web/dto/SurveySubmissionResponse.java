package com.chotomua.backend.modules.crm.web.dto;

import java.time.Instant;
import java.util.UUID;

/** Phiếu khách vừa nộp. */
public record SurveySubmissionResponse(
        UUID id,
        UUID surveyId,
        UUID userId,
        UUID orderId,
        Instant submittedAt
) {
}
