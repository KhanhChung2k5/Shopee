package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Funnel hiệu quả chiến dịch in-app: nhắm → gửi → mua sản phẩm mục tiêu sau giờ gửi.
 * {@code conversionRate} = mua / đã gửi. Không chứng minh click hay checkout.
 */
public record CampaignFunnelResponse(
        UUID campaignId,
        String name,
        Instant windowFrom,
        Instant windowTo,
        boolean convertible,
        int targeted,
        int sent,
        int converted,
        BigDecimal conversionRate,
        List<UUID> productIds,
        List<ReportBucket> stages
) {
}
