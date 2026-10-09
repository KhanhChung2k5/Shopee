package com.chotomua.backend.modules.order.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WalletTopUpResponse(
        UUID paymentId,
        String paymentStatus,
        WalletTransactionResponse transaction,
        BigDecimal balance,
        boolean simulated
) {
}
