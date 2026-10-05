package com.chototmua.crm.port.dto;

import java.util.UUID;

/** Địa chỉ giao hàng của khách (bảng {@code addresses}). */
public record AddressView(
        UUID id,
        UUID userId,
        String recipientName,
        String phone,
        String fullAddress,
        boolean isDefault
) {
}
