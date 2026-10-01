package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.LoyaltyTransaction;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record LoyaltyResponse(int balance, String tier, List<Transaction> transactions) {

    public record Transaction(UUID id, UUID orderId, int points, String reason, OffsetDateTime createdAt) {
        public static Transaction from(LoyaltyTransaction transaction) {
            return new Transaction(transaction.getId(), transaction.getOrderId(), transaction.getPoints(),
                    transaction.getReason(), transaction.getCreatedAt());
        }
    }
}
