package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** Tạo hoặc sửa phân khúc. {@code ruleDefinition} là preset tuổi / RFM / danh mục. */
public record UpsertSegmentRequest(
        @NotBlank String name,
        @NotNull Map<String, Object> ruleDefinition
) {
}
