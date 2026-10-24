package com.chotomua.backend.modules.order.dto;

import java.util.UUID;

/** Who placed an order — only filled in for staff views; a buyer's own order view leaves it null. */
public record OrderCustomerResponse(
        UUID userId,
        String fullName,
        String email,
        String phone,
        String recipientName,
        String recipientPhone
) {
}
