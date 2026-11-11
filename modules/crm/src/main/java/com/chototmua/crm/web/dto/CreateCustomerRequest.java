package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.CreateCustomerCommand;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Dữ liệu thêm khách từ Admin / quản lý CRM. Kiểm tra ngay tại biên REST. */
public record CreateCustomerRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        String gender,
        LocalDate dob
) {

    public CreateCustomerCommand toCommand() {
        return new CreateCustomerCommand(fullName, email, phone, gender, dob);
    }
}
