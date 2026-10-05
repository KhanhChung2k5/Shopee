package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Tạo chiến dịch in-app và gửi ngay. {@code surveyId} có thì thông báo trỏ tới khảo sát. */
public record CreateCampaignRequest(
        @NotBlank @Size(max = 255) String name,
        @NotEmpty List<UUID> segmentIds,
        @NotBlank @Size(max = 500) String content,
        UUID surveyId,
        Instant startAt,
        Instant endAt
) {
}
