package com.chototmua.crm.web.dto;

/** Phân trang danh sách — thêm từ đầu để khi dữ liệu lớn client không phải đổi hợp đồng. */
public record PaginationResponse(
        int page,
        int pageSize,
        long totalItems,
        int totalPages
) {
}
