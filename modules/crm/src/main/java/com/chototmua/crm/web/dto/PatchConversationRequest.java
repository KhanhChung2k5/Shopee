package com.chototmua.crm.web.dto;

/** Cập nhật trạng thái, mức ưu tiên hoặc loại hội thoại. Trường trống giữ nguyên. */
public record PatchConversationRequest(
        String status,
        String priority,
        String type
) {
}
