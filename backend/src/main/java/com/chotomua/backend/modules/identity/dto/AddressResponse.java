package com.chotomua.backend.modules.identity.dto;

import java.util.UUID;

public record AddressResponse(
        UUID id,
        String recipientName,
        String phone,
        String fullAddress,
        boolean isDefault
) {
    public static AddressResponse from(com.chotomua.backend.modules.identity.Address address) {
        return new AddressResponse(
                address.getId(),
                address.getRecipientName(),
                address.getPhone(),
                address.getFullAddress(),
                address.isDefault()
        );
    }
}
