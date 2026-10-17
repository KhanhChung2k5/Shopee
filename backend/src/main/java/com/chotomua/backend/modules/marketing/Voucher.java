package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vouchers")
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "promotion_program_id", nullable = false)
    private UUID promotionProgramId;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal value;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    protected Voucher() {
    }

    public Voucher(VoucherRequest request, String normalizedCode) {
        update(request, normalizedCode);
    }

    public void update(VoucherRequest request, String normalizedCode) {
        promotionProgramId = request.promotionProgramId();
        code = normalizedCode;
        type = request.type();
        value = request.value();
        expiresAt = request.expiresAt();
    }

    public UUID getId() { return id; }
    public UUID getPromotionProgramId() { return promotionProgramId; }
    public String getCode() { return code; }
    public String getType() { return type; }
    public BigDecimal getValue() { return value; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
}
