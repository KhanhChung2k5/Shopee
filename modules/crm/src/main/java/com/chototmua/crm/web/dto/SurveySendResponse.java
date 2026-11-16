package com.chototmua.crm.web.dto;

import java.util.List;

/** Kết quả đưa khảo sát vào hòm thư. Không tạo chiến dịch. */
public record SurveySendResponse(
        SurveyResponse survey,
        int sentCount,
        List<SkippedRecipientResponse> skipped
) {
}
