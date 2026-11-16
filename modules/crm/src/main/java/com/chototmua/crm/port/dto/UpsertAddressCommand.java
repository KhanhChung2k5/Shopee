package com.chototmua.crm.port.dto;

/** Tạo hoặc cập nhật địa chỉ giao hàng. */
public record UpsertAddressCommand(
        String recipientName,
        String phone,
        String fullAddress,
        boolean isDefault
) {
}
