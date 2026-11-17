package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Tạo khảo sát bản nháp. Chưa gửi. {@code segmentIds} nhớ đối tượng đã chọn. */
public record CreateSurveyRequest(
        @NotBlank @Size(max = 255) String title,
        String description,
        List<UUID> segmentIds
) {
}
