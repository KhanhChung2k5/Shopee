package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Kết quả hook demo: số khảo sát in-app vừa gửi cho đơn đã giao. */
public record OrderDeliveredSurveyResponse(
        UUID orderId,
        UUID userId,
        int sentCount,
        List<UUID> surveyIds
) {
}
