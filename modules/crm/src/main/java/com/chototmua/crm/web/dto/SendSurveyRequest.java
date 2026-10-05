package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

/** Gửi khảo sát thẳng vào hòm thư của khách thuộc các phân khúc đã chọn. */
public record SendSurveyRequest(
        @NotEmpty List<UUID> segmentIds
) {
}
