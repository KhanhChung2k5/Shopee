package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @Pattern(regexp = "^$|^[0-9+ ]{8,15}$", message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank
        @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Mật khẩu phải chứa ít nhất 1 chữ và 1 số"
        )
        String password,
        String fullName
) {
}
