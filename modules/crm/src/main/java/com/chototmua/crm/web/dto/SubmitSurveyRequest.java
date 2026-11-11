package com.chototmua.crm.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/** Khách nộp khảo sát. {@code orderId} chỉ có khi phiếu gắn một đơn hàng. */
public record SubmitSurveyRequest(
        UUID orderId,
        @NotNull List<@Valid SubmitSurveyAnswerRequest> answers
) {
}
