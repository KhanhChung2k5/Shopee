package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Giỏ hàng — ánh xạ bảng {@code cart_items}.
 *
 * <p>Bảng {@code carts} (v1–v17) đã được gộp thẳng vào {@code cart_items.user_id} ở v18
 * vì Cart chỉ có id/userId/updatedAt và không có ý nghĩa nghiệp vụ độc lập nào.
 * CartItem trỏ thẳng đến {@code users.id} thay vì qua bảng trung gian.</p>
 *
 * <p>Trường {@code isSelected} đánh dấu item được chọn để checkout;
 * chỉ những item có {@code isSelected = true} mới được chuyển thành {@link OrderItem}.</p>
 */
@Entity
@Table(name = "cart_items")
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Tham chiếu đến {@code users.id} — không dùng quan hệ {@code @ManyToOne}
     * để tránh phụ thuộc cross-module vào {@code identity.User}.
     * Service layer tự validate userId tồn tại trước khi lưu.
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Tham chiếu đến {@code product_variants.id} — cross-module, lưu ID thô. */
    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(nullable = false)
    private Integer quantity = 1;

    /**
     * Đánh dấu item được chọn để checkout.
     * Mặc định {@code true} khi thêm vào giỏ.
     */
    @Column(name = "is_selected", nullable = false)
    private Boolean isSelected = true;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected CartItem() {
    }

    public CartItem(UUID userId, UUID variantId, Integer quantity) {
        this.userId = userId;
        this.variantId = variantId;
        this.quantity = quantity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getVariantId() {
        return variantId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        this.updatedAt = OffsetDateTime.now();
    }

    public Boolean getIsSelected() {
        return isSelected;
    }

    public void setIsSelected(Boolean isSelected) {
        this.isSelected = isSelected;
        this.updatedAt = OffsetDateTime.now();
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
