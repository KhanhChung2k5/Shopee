package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Dòng chi tiết trong đơn hàng — ánh xạ bảng {@code order_items}.
 *
 * <p>Các trường {@code productNameSnapshot} và {@code variantAttributesSnapshot}
 * lưu snapshot tên sản phẩm và thuộc tính biến thể tại thời điểm đặt hàng,
 * đảm bảo lịch sử đơn không bị đổi hồi tố khi thông tin sản phẩm thay đổi.</p>
 *
 * <p>{@code lineTotal} = {@code quantity} × {@code unitPrice}, lưu sẵn để
 * tính toán nhanh khi hiển thị chi tiết hóa đơn mà không cần nhân lại.</p>
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Tham chiếu {@code orders.id} — FK cứng trong DB, lưu ID thô ở entity. */
    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    /** Tham chiếu {@code product_variants.id} — cross-module, lưu ID thô. */
    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(nullable = false)
    private Integer quantity;

    /** Giá tại thời điểm đặt hàng — không thay đổi dù giá sản phẩm sau này thay đổi. */
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    /** {@code quantity} × {@code unitPrice} — lưu sẵn cho chi tiết hóa đơn. */
    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    /** Snapshot tên sản phẩm tại thời điểm đặt hàng. */
    @Column(name = "product_name_snapshot", length = 255)
    private String productNameSnapshot;

    /**
     * Snapshot thuộc tính biến thể (màu, size, nền tảng, ...) dạng JSON tại thời điểm đặt hàng.
     * Ví dụ: {@code {"color":"Đen","platform":"PS5"}}.
     * Dùng {@code columnDefinition = "jsonb"} để Hibernate không map sai kiểu.
     */
    @Column(name = "variant_attributes_snapshot", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String variantAttributesSnapshot;

    protected OrderItem() {
    }

    public OrderItem(UUID orderId, UUID variantId, Integer quantity,
                     BigDecimal unitPrice, String productNameSnapshot,
                     String variantAttributesSnapshot) {
        this.orderId = orderId;
        this.variantId = variantId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        this.productNameSnapshot = productNameSnapshot;
        this.variantAttributesSnapshot = variantAttributesSnapshot;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getVariantId() {
        return variantId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public String getVariantAttributesSnapshot() {
        return variantAttributesSnapshot;
    }
}
