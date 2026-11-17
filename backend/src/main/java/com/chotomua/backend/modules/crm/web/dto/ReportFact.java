package com.chotomua.backend.modules.crm.web.dto;

import java.util.UUID;

/**
 * Một dòng để lọc chéo dashboard: nhân khẩu của khách gắn với một dòng đơn đã giao.
 * Khách chưa có đơn thì category, genre và sản phẩm để trống.
 * {@code quantity} là số lượng trên dòng; khách chưa mua thì bằng 0.
 */
public record ReportFact(
        UUID customerId,
        String age,
        String ageLabel,
        String gender,
        String genderLabel,
        UUID categoryId,
        String categoryName,
        String genre,
        UUID productId,
        String productName,
        int quantity
) {
}
