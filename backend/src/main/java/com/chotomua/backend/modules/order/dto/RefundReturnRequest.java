package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Buyer sends one delivered line back; the refund is transferred to this bank account once CS approves. */
public record RefundReturnRequest(
        @NotNull UUID orderItemId,
        @NotBlank @Size(min = 5, max = 500) String reason,
        @NotBlank @Size(max = 100) String bankName,
        @NotBlank @Pattern(regexp = "[0-9]{6,20}", message = "Số tài khoản chỉ gồm 6–20 chữ số") String bankAccountNo,
        @NotBlank @Size(max = 255) String bankAccountName
) {
}
