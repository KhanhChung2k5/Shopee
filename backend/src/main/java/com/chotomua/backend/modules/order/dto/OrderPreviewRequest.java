package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.Size;

public record OrderPreviewRequest(@Size(max = 50) String voucherCode) {
}
