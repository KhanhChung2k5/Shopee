package com.chototmua.crm.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Danh mục xuất hiện trên đơn đã giao — suy sở thích, không bảng hobby. */
public record InterestBucket(
        UUID categoryId,
        String categoryName,
        long count,
        BigDecimal percent
) {
}
