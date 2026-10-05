package com.chototmua.crm.web.dto;

import com.chototmua.crm.port.dto.AddressView;
import com.chototmua.crm.port.dto.CustomerView;

import java.util.List;

/** Hồ sơ khách kèm danh sách địa chỉ — dùng cho modal xem thông tin. */
public record CustomerDetailResponse(
        CustomerView customer,
        List<AddressView> addresses
) {
}
