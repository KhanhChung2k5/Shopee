package com.chotomua.backend.modules.crm.web.dto;

import java.util.List;

/** Danh sách nhật ký kèm phân trang. */
public record OperationLogListResponse(
        List<OperationLogItem> data,
        PaginationResponse pagination
) {
}
