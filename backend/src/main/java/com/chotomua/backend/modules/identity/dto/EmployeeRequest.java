package com.chotomua.backend.modules.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Admin tạo nhân viên nội bộ: tạo cả User (role=staff) lẫn Employee cùng lúc,
 * không phải gán department cho user có sẵn (buyer không tự "trở thành" nhân viên).
 */
public record EmployeeRequest(
        @Email @NotBlank String email,
        String phone,
        @NotBlank @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự") String password,
        @NotBlank String fullName,
        @NotBlank String department,
        String position,
        BigDecimal baseSalary
) {
}
