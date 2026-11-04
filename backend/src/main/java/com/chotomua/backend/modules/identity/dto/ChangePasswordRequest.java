package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Nhập mật khẩu hiện tại") String currentPassword,
        @NotBlank
        @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải chứa ít nhất 1 chữ và 1 số")
        String newPassword
) {
}
