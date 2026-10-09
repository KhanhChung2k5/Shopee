package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderStatusUpdateRequest(
        @NotBlank String status,
        @Size(max = 500) String reason
) {
}
