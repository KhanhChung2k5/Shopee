package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CartItemQuantityRequest(
        @NotNull @Positive Integer quantity
) {
}
