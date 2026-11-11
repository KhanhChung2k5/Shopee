package com.chototmua.crm.web.dto;

import java.util.UUID;

/**
 * Một dòng để lọc chéo dashboard: nhân khẩu của khách gắn với một dòng đơn đã giao.
 * Khách chưa có đơn thì category và genre để trống.
 */
public record ReportFact(
        UUID customerId,
        String age,
        String ageLabel,
        String gender,
        String genderLabel,
        UUID categoryId,
        String categoryName,
        String genre
) {
}
