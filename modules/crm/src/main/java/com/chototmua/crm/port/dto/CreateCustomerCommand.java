package com.chototmua.crm.port.dto;

import java.time.LocalDate;

/**
 * Dữ liệu tối thiểu để cổng danh tính tạo khách.
 * Kiểm tra đầu vào nằm ở lớp REST, không nằm giữa các hàm nội bộ.
 */
public record CreateCustomerCommand(
        String fullName,
        String email,
        String phone,
        String gender,
        LocalDate dob
) {
}
