package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "promotion_programs")
public class PromotionProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "program_type", nullable = false, length = 20)
    private String programType;

    @Column(name = "target_loyalty_tier", length = 50)
    private String targetLoyaltyTier;

    @Column(name = "start_at", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private OffsetDateTime endAt;

    protected PromotionProgram() {
    }

    public PromotionProgram(PromotionProgramRequest request, String normalizedCode) {
        update(request, normalizedCode);
    }

    public void update(PromotionProgramRequest request, String normalizedCode) {
        code = normalizedCode;
        name = request.name().trim();
        programType = request.programType().trim();
        targetLoyaltyTier = request.targetLoyaltyTier() == null || request.targetLoyaltyTier().isBlank()
                ? null : request.targetLoyaltyTier().trim();
        startAt = request.startAt();
        endAt = request.endAt();
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getProgramType() { return programType; }
    public String getTargetLoyaltyTier() { return targetLoyaltyTier; }
    public OffsetDateTime getStartAt() { return startAt; }
    public OffsetDateTime getEndAt() { return endAt; }
}
