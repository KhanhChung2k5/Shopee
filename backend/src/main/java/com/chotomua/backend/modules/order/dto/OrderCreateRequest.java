package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record OrderCreateRequest(
        @NotNull UUID addressId,
        @Size(max = 50) String voucherCode
) {
    public OrderCreateRequest(UUID addressId) {
        this(addressId, null);
    }
}
