package com.chotomua.backend.modules.crm.web.dto;

import com.chotomua.backend.modules.crm.port.dto.CreateCustomerCommand;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * CSKH thêm khách mới: hồ sơ như {@link CreateCustomerRequest} cộng mật khẩu đăng nhập ban đầu do CSKH đặt.
 * Sửa hồ sơ (PUT) vẫn dùng {@link CreateCustomerRequest}, không đụng tới mật khẩu.
 * 72 là giới hạn của BCrypt.
 */
public record NewCustomerRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        String gender,
        LocalDate dob,
        @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu phải có từ 8 đến 72 ký tự") String password
) {

    public CreateCustomerCommand toCommand() {
        return new CreateCustomerCommand(fullName, email, phone, gender, dob);
    }
}
