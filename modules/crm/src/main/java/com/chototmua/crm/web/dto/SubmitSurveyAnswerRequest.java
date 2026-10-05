package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Một câu trả lời khi khách nộp khảo sát. */
public record SubmitSurveyAnswerRequest(
        @NotNull UUID questionId,
        @NotBlank String answerText
) {
}
