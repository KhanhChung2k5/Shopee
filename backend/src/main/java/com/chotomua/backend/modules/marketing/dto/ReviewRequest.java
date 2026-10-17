package com.chotomua.backend.modules.marketing.dto;
import jakarta.validation.constraints.*; import java.util.UUID;
public record ReviewRequest(@NotNull UUID orderItemId,@Min(1) @Max(5) int rating,@Size(max=2000) String comment){}
