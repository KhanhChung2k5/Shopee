package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderTrackingUpdateRequest(
        @NotBlank @Size(max = 100) String trackingNo,
        @NotBlank String shipmentStatus
) {
}
