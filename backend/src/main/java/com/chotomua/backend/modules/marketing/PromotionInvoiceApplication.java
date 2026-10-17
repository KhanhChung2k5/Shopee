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
@Table(name = "promotion_invoice_applications")
public class PromotionInvoiceApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "promotion_invoice_detail_id", nullable = false)
    private UUID promotionInvoiceDetailId;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "applied_at", nullable = false)
    private OffsetDateTime appliedAt = OffsetDateTime.now();

    protected PromotionInvoiceApplication() {
    }

    public PromotionInvoiceApplication(UUID orderId, UUID promotionInvoiceDetailId, BigDecimal discountAmount) {
        this.orderId = Objects.requireNonNull(orderId);
        this.promotionInvoiceDetailId = Objects.requireNonNull(promotionInvoiceDetailId);
        this.discountAmount = Objects.requireNonNull(discountAmount);
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public UUID getPromotionInvoiceDetailId() { return promotionInvoiceDetailId; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public OffsetDateTime getAppliedAt() { return appliedAt; }
}
