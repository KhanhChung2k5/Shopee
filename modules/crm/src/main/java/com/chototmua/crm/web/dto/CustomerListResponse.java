package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.CustomerView;

import java.util.List;

/** Kết quả liệt kê khách kèm phân trang. */
public record CustomerListResponse(
        List<CustomerView> data,
        PaginationResponse pagination
) {
}
