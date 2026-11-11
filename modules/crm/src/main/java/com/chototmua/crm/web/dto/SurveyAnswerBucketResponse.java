package com.chototmua.crm.web.dto;

/** Số người chọn một mức điểm hoặc một phương án. */
public record SurveyAnswerBucketResponse(
        String value,
        int count
) {
}
