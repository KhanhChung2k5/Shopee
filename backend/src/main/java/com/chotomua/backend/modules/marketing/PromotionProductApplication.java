package com.chotomua.backend.modules.marketing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "promotion_product_applications")
public class PromotionProductApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_item_id", nullable = false)
    private UUID orderItemId;

    @Column(name = "promotion_product_detail_id", nullable = false)
    private UUID promotionProductDetailId;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "applied_at", nullable = false)
    private OffsetDateTime appliedAt = OffsetDateTime.now();

    protected PromotionProductApplication() {
    }

    public PromotionProductApplication(UUID orderItemId, UUID promotionProductDetailId, BigDecimal discountAmount) {
        this.orderItemId = Objects.requireNonNull(orderItemId);
        this.promotionProductDetailId = Objects.requireNonNull(promotionProductDetailId);
        this.discountAmount = Objects.requireNonNull(discountAmount);
    }

    public UUID getId() { return id; }
    public UUID getOrderItemId() { return orderItemId; }
    public UUID getPromotionProductDetailId() { return promotionProductDetailId; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public OffsetDateTime getAppliedAt() { return appliedAt; }
}
