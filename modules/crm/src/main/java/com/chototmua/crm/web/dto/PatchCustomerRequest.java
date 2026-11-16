package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Cập nhật một phần: {@code locked} khóa, {@code active} mở khóa hoặc khôi phục (admin),
 * {@code deleted} xóa mềm.
 */
public record PatchCustomerRequest(
        @NotBlank String status
) {
}
