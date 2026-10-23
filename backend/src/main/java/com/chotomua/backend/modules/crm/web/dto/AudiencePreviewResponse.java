package com.chotomua.backend.modules.crm.web.dto;

/** Ước tính nhanh: số sản phẩm khớp và số khách đang hoạt động từng mua chúng. */
public record AudiencePreviewResponse(int productCount, int activeBuyerCount) {
}
