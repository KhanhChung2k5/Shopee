package com.chotomua.backend.modules.order.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Checkout payment of an order: method cod | bank_transfer; status pending | paid | cancelled. */
public record OrderPaymentResponse(String method, String status, BigDecimal amount, OffsetDateTime paidAt) {
}
