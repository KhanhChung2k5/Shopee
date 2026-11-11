package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Một khách trên dashboard: nhân khẩu kèm LTV và nhãn RFM tính từ đơn đã giao.
 */
public record ReportCustomer(
        UUID customerId,
        String fullName,
        String age,
        String ageLabel,
        String gender,
        String genderLabel,
        BigDecimal ltv,
        int totalOrders,
        String rfmSegment
) {
}
