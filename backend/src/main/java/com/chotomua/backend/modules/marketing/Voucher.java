package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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

    /** product_type values (game_disc | controller | accessory) this voucher discounts; empty = every product. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_product_types", columnDefinition = "jsonb", nullable = false)
    private List<String> targetProductTypes = new ArrayList<>();

    /** The order (its lines the voucher covers) must reach this to qualify; null = no minimum. */
    @Column(name = "min_order_amount", precision = 12, scale = 2)
    private BigDecimal minOrderAmount;

    /** Most a percentage voucher takes off; null = no cap. */
    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    /** Orders (not cancelled) that may use the code in total; null = unlimited. */
    @Column(name = "usage_limit")
    private Integer usageLimit;

    /** Only buyers with no order yet (cancelled ones aside). */
    @Column(name = "new_customers_only", nullable = false)
    private boolean newCustomersOnly;

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
        targetProductTypes = request.targetProductTypes() == null
                ? new ArrayList<>() : new ArrayList<>(new LinkedHashSet<>(request.targetProductTypes()));
        minOrderAmount = request.minOrderAmount();
        maxDiscountAmount = request.maxDiscountAmount();
        usageLimit = request.usageLimit();
        newCustomersOnly = Boolean.TRUE.equals(request.newCustomersOnly());
    }

    public UUID getId() { return id; }
    public UUID getPromotionProgramId() { return promotionProgramId; }
    public String getCode() { return code; }
    public String getType() { return type; }
    public BigDecimal getValue() { return value; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
    public Integer getUsageLimit() { return usageLimit; }
    public boolean isNewCustomersOnly() { return newCustomersOnly; }
    public List<String> getTargetProductTypes() { return targetProductTypes == null ? List.of() : List.copyOf(targetProductTypes); }
}
