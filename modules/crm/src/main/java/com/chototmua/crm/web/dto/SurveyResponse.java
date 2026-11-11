package com.chototmua.crm.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Một khảo sát kèm câu hỏi. */
public record SurveyResponse(
        UUID id,
        UUID createdByEmployeeId,
        String title,
        String description,
        String status,
        Instant createdAt,
        List<SurveyQuestionResponse> questions,
        List<UUID> segmentIds
) {
}
