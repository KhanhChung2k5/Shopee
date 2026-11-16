package com.chototmua.crm.port.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Một dòng đơn đã giao — có danh mục để báo cáo sở thích,
 * không kéo thực thể sản phẩm sang CRM.
 */
public record DeliveredOrderLine(
        UUID productId,
        UUID categoryId,
        String categoryName,
        BigDecimal lineTotal,
        String genre
) {
    /** Dòng không có thể loại — tay cầm và phụ kiện. */
    public DeliveredOrderLine(UUID productId, UUID categoryId, String categoryName, BigDecimal lineTotal) {
        this(productId, categoryId, categoryName, lineTotal, null);
    }
}
