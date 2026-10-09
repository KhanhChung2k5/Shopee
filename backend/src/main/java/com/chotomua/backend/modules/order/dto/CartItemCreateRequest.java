package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.UUID;

public record CartItemCreateRequest(
        @NotNull UUID variantId,
        @NotNull @Positive Integer quantity
) {
}
