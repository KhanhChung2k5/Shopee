package com.chotomua.backend.modules.marketing.dto;

import com.chotomua.backend.modules.marketing.PromotionProgram;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PromotionProgramResponse(
        UUID id, String code, String name, String programType, String targetLoyaltyTier,
        OffsetDateTime startAt, OffsetDateTime endAt
) {
    public static PromotionProgramResponse from(PromotionProgram program) {
        return new PromotionProgramResponse(program.getId(), program.getCode(), program.getName(),
                program.getProgramType(), program.getTargetLoyaltyTier(), program.getStartAt(), program.getEndAt());
    }
}
