package com.chototmua.crm.web.dto;

/** Gửi tin. {@code kind=internal} chỉ agent thấy; mặc định là tin công khai. */
public record PostMessageRequest(
        String kind,
        String content
) {
}
