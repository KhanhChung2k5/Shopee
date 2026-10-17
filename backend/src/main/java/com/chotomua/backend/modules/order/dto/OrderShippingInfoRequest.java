package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record OrderShippingInfoRequest(
        @NotNull UUID warehouseId,
        @NotBlank @Size(max = 255) String shippingProviderName
) {
}
