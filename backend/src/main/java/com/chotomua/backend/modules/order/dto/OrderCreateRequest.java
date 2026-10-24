package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record OrderCreateRequest(
        @NotNull UUID addressId,
        @Size(max = 50) String voucherCode,
        @Pattern(regexp = "cod|bank_transfer", message = "Phương thức thanh toán không hợp lệ") String paymentMethod
) {
    public OrderCreateRequest(UUID addressId) {
        this(addressId, null, "cod");
    }

    public OrderCreateRequest(UUID addressId, String voucherCode) {
        this(addressId, voucherCode, "cod");
    }
}
