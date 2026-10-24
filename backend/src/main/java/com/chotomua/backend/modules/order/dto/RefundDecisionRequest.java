package com.chotomua.backend.modules.order.dto;

import jakarta.validation.constraints.Size;

/** Staff note: why a return is rejected, or the bank transaction code of the transfer back to the buyer. */
public record RefundDecisionRequest(@Size(max = 500) String note, @Size(max = 100) String transferRef) {
}
