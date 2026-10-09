package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;

public record CartItemSelectionRequest(
        @NotNull Boolean isSelected
) {
}
