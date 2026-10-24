package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Where the buyer wants the money sent — needed before CS can transfer a cancellation refund. */
public record RefundBankAccountRequest(
        @NotBlank @Size(max = 100) String bankName,
        @NotBlank @Pattern(regexp = "[0-9]{6,20}", message = "Số tài khoản chỉ gồm 6–20 chữ số") String bankAccountNo,
        @NotBlank @Size(max = 255) String bankAccountName
) {
}
