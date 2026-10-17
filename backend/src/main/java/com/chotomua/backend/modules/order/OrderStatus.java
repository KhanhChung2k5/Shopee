package com.chotomua.backend.modules.order;

import java.util.Arrays;
import java.util.Locale;

public enum OrderStatus {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    CANCEL_REQUESTED("cancel_requested"),
    SHIPPING("shipping"),
    DELIVERED("delivered"),
    CANCELLED("cancelled");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static String normalize(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        String normalized = rawValue.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .map(OrderStatus::value)
                .filter(normalized::equals)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Trạng thái đơn hàng không hợp lệ"));
    }
}
