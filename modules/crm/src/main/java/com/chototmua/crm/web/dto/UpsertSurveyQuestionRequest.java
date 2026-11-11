package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Thêm hoặc sửa câu hỏi.
 * {@code answerType}: {@code text}, {@code rating}, {@code multiple_choice}.
 * Trắc nghiệm bắt buộc {@code options} vì schema không có cột lựa chọn.
 */
public record UpsertSurveyQuestionRequest(
        @NotBlank String questionText,
        @NotBlank String answerType,
        List<String> options,
        Integer sortOrder
) {
}
