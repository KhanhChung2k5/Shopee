package com.chotomua.backend.modules.order;

import java.util.Arrays;
import java.util.Locale;

public enum ShipmentStatus {
    PENDING("pending"),
    PACKED("packed"),
    SHIPPING("shipping"),
    DELIVERED("delivered");

    private final String value;

    ShipmentStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static String normalize(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new IllegalArgumentException("Trạng thái giao hàng không được để trống");
        }
        String normalized = rawValue.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .map(ShipmentStatus::value)
                .filter(normalized::equals)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Trạng thái giao hàng không hợp lệ"));
    }
}
