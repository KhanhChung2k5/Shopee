package com.chotomua.backend.modules.crm.port.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Ảnh đọc danh mục — CRM không sửa sản phẩm, chỉ lọc / gợi ý / gắn khảo sát.
 */
public record ProductView(
        UUID id,
        String name,
        String brandName,
        String productType,
        UUID categoryId,
        String categoryName,
        String genre,
        List<String> platforms,
        BigDecimal price,
        String status
) {
    public ProductView {
        platforms = platforms == null ? List.of() : List.copyOf(platforms);
    }
}
