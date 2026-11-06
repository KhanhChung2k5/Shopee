package com.chotomua.backend.modules.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Sửa tên, nội dung và giờ gửi nếu thư chưa phát. */
public record UpdateCampaignRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 500) String content,
        Instant startAt,
        /** Chỉ dùng cho bản nháp; null = giữ phân khúc cũ. */
        List<UUID> segmentIds
) {
}
