package com.chotomua.backend.modules.crm.web.dto;

import com.chotomua.backend.modules.crm.port.dto.ProductView;

import java.util.List;

/** Kết quả tìm sản phẩm: {@code total} là số khớp thật, {@code products} có thể bị cắt. */
public record ProductListResponse(List<ProductView> products, int total) {
}
