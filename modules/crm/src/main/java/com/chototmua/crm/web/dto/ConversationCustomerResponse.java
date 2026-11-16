package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Cột phải của bàn CSKH: nhãn RFM, chi nhánh, chi tiêu, đơn gần nhất, ticket cũ. */
public record ConversationCustomerResponse(
        UUID userId,
        String fullName,
        String tier,
        String tierLabel,
        String branch,
        BigDecimal totalSpend,
        int totalOrders,
        UUID lastOrderId,
        BigDecimal lastOrderAmount,
        Instant lastOrderAt,
        List<ConversationHistoryItem> history
) {
}
