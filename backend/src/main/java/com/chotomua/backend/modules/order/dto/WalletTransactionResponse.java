package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.WalletTransaction;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WalletTransactionResponse(
        UUID id,
        UUID orderId,
        String type,
        BigDecimal amount,
        OffsetDateTime createdAt
) {
    public static WalletTransactionResponse from(WalletTransaction transaction) {
        return new WalletTransactionResponse(
                transaction.getId(),
                transaction.getOrderId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getCreatedAt()
        );
    }
}
