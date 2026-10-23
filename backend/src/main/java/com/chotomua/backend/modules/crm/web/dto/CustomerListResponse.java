package com.chotomua.backend.modules.crm.web.dto;

import com.chotomua.backend.modules.crm.port.dto.CustomerView;

import java.util.List;

/** Kết quả liệt kê khách kèm phân trang. */
public record CustomerListResponse(
        List<CustomerView> data,
        PaginationResponse pagination
) {
}
