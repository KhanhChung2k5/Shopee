package com.chototmua.crm.web.dto;

import java.util.UUID;

/** Khách mở hội thoại. Bỏ trống {@code type} thì hệ thống chọn theo agent có đang trực. */
public record CreateConversationRequest(
        String type,
        UUID orderId,
        String topic,
        String content
) {
}
