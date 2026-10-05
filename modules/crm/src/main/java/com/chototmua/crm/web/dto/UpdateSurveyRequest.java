package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Sửa tiêu đề, mô tả và đối tượng. Phiếu lưu trữ thì không sửa. */
public record UpdateSurveyRequest(
        @NotBlank @Size(max = 255) String title,
        String description,
        List<UUID> segmentIds
) {
}
