package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "promotion_invoice_details")
public class PromotionInvoiceDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "promotion_program_id", nullable = false)
    private UUID promotionProgramId;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    /** Goods subtotal the order must reach to qualify; null = every order. */
    @Column(name = "min_order_amount", precision = 12, scale = 2)
    private BigDecimal minOrderAmount;

    /** Most a percentage promotion takes off; null = no cap. */
    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    protected PromotionInvoiceDetail() {
    }

    public PromotionInvoiceDetail(InvoiceDiscountRequest request) {
        update(request);
    }

    public void update(InvoiceDiscountRequest request) {
        promotionProgramId = request.promotionProgramId();
        discountAmount = request.discountAmount();
        discountPercent = request.discountPercent();
        minOrderAmount = request.minOrderAmount();
        maxDiscountAmount = request.maxDiscountAmount();
    }

    public UUID getId() { return id; }
    public UUID getPromotionProgramId() { return promotionProgramId; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getDiscountPercent() { return discountPercent; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
}
