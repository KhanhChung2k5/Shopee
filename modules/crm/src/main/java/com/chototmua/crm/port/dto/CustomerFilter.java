package com.chototmua.crm.port.dto;

/**
 * Bộ lọc danh sách khách. Cờ « hiện đã xóa » không nằm đây —
 * để mặc định luôn ẩn {@code deleted} trừ khi giao diện bật.
 */
public record CustomerFilter(
        String status,
        String search
) {
}
