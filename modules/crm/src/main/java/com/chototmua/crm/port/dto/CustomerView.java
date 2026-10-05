package com.chototmua.crm.port.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Hồ sơ khách mà CRM được đọc qua cổng danh tính.
 * Không gồm mật khẩu đã băm — không lộ chi tiết đăng nhập.
 */
public record CustomerView(
        UUID id,
        String fullName,
        String email,
        String phone,
        String gender,
        LocalDate dob,
        String status
) {
}
