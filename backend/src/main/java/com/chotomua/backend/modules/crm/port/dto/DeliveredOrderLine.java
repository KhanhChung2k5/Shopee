package com.chotomua.backend.modules.crm.port.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Một dòng đơn đã giao — có danh mục để báo cáo sở thích,
 * tên và số lượng để popup sản phẩm mua nhiều trên dashboard.
 */
public record DeliveredOrderLine(
        UUID productId,
        UUID categoryId,
        String categoryName,
        BigDecimal lineTotal,
        String genre,
        String productName,
        int quantity
) {
    /** Dòng không có thể loại — tay cầm và phụ kiện. */
    public DeliveredOrderLine(UUID productId, UUID categoryId, String categoryName, BigDecimal lineTotal) {
        this(productId, categoryId, categoryName, lineTotal, null, null, 1);
    }

    /** Dòng có thể loại, chưa kèm tên sản phẩm. */
    public DeliveredOrderLine(UUID productId, UUID categoryId, String categoryName, BigDecimal lineTotal, String genre) {
        this(productId, categoryId, categoryName, lineTotal, genre, null, 1);
    }
}
