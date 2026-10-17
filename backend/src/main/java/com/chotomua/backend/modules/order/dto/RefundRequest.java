package com.chotomua.backend.modules.order.dto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
public record RefundRequest(@NotNull UUID orderItemId, @Size(min = 3, max = 500) String reason) {}
