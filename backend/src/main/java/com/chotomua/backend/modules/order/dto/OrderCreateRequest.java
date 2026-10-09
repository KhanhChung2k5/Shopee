package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrderCreateRequest(
        @NotNull UUID addressId
) {
}
