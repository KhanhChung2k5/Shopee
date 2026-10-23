package com.chotomua.backend.modules.crm.port.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Bộ lọc tìm kiếm nâng cao trên catalog (đọc). Tiêu chí trống thì bỏ qua.
 */
public record ProductFilter(
        String keyword,
        String productType,
        UUID categoryId,
        String genre,
        String platform,
        BigDecimal priceMin,
        BigDecimal priceMax,
        boolean publishedOnly
) {
    public ProductFilter {
        keyword = blankToNull(keyword);
        productType = blankToNull(productType);
        genre = blankToNull(genre);
        platform = blankToNull(platform);
    }

    /** True khi không có tiêu chí nào — không dùng để search catalog. */
    public boolean isUnconstrained() {
        return keyword == null
                && productType == null
                && categoryId == null
                && genre == null
                && platform == null
                && priceMin == null
                && priceMax == null
                && !publishedOnly;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
