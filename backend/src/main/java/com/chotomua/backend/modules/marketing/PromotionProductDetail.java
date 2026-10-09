package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "promotion_product_details")
public class PromotionProductDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "promotion_program_id", nullable = false)
    private UUID promotionProgramId;

    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "flash_price", precision = 12, scale = 2)
    private BigDecimal flashPrice;

    @Column(name = "limit_qty")
    private Integer limitQty;

    @Column(name = "sold_qty", nullable = false)
    private Integer soldQty = 0;

    protected PromotionProductDetail() {
    }

    public PromotionProductDetail(ProductDiscountRequest request) {
        update(request);
    }

    public void update(ProductDiscountRequest request) {
        promotionProgramId = request.promotionProgramId();
        variantId = request.variantId();
        discountPercent = request.discountPercent();
        flashPrice = request.flashPrice();
        limitQty = request.limitQty();
    }

    public UUID getId() { return id; }
    public UUID getPromotionProgramId() { return promotionProgramId; }
    public UUID getVariantId() { return variantId; }
    public BigDecimal getDiscountPercent() { return discountPercent; }
    public BigDecimal getFlashPrice() { return flashPrice; }
    public Integer getLimitQty() { return limitQty; }
    public Integer getSoldQty() { return soldQty; }
}
