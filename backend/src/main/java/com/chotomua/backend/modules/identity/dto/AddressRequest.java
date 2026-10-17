package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record AddressRequest(
        @NotBlank String recipientName,
        @NotBlank String phone,
        @NotBlank String fullAddress,
        boolean isDefault
) {
}
