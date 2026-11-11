package com.chototmua.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** Sửa tên, nội dung và giờ gửi nếu thư chưa phát. */
public record UpdateCampaignRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 500) String content,
        Instant startAt
) {
}
