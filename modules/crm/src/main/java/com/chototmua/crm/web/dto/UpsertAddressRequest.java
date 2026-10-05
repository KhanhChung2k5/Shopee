package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.UpsertAddressCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dữ liệu tạo/sửa địa chỉ từ Admin / quản lý CRM. */
public record UpsertAddressRequest(
        @NotBlank @Size(max = 255) String recipientName,
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 500) String fullAddress,
        Boolean isDefault
) {

    public UpsertAddressCommand toCommand() {
        return new UpsertAddressCommand(
                recipientName,
                phone,
                fullAddress,
                isDefault == null || isDefault);
    }
}
