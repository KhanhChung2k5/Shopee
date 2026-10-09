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
 * Audit trail lịch sử thay đổi trạng thái đơn hàng — ánh xạ bảng {@code order_status_histories}.
 *
 * <p>Mỗi lần {@link Order#setStatus(String)} được gọi, service layer phải tạo một
 * bản ghi {@code OrderStatusHistory} tương ứng để theo dõi ai, khi nào, và vì sao
 * đơn hàng đổi trạng thái. Bảng này là append-only — không bao giờ cập nhật hay xóa.</p>
 *
 * <p>{@code changedByType}: {@code buyer} (khách tự hủy), {@code employee} (nhân viên xử lý),
 * {@code system} (hệ thống tự động, ví dụ COD xác nhận).</p>
 */
@Entity
@Table(name = "order_status_histories")
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Tham chiếu {@code orders.id}. */
    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    /** Trạng thái mới sau khi thay đổi: {@code pending|confirmed|shipping|delivered|cancelled}. */
    @Column(nullable = false, length = 20)
    private String status;

    /**
     * Người thực hiện thay đổi — tham chiếu {@code users.id}.
     * {@code null} khi {@code changedByType = "system"}.
     * Cross-module, lưu ID thô.
     */
    @Column(name = "changed_by")
    private UUID changedBy;

    /**
     * Phân loại tác nhân thay đổi: {@code buyer | employee | system}.
     */
    @Column(name = "changed_by_type", length = 20)
    private String changedByType;

    /** Lý do thay đổi trạng thái — bắt buộc khi hủy đơn. */
    @Column(length = 500)
    private String reason;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt = OffsetDateTime.now();

    protected OrderStatusHistory() {
    }

    /**
     * Tạo bản ghi lịch sử trạng thái.
     *
     * @param orderId       ID đơn hàng
     * @param status        Trạng thái mới
     * @param changedBy     UUID người thực hiện, {@code null} nếu system
     * @param changedByType {@code buyer | employee | system}
     * @param reason        Lý do (bắt buộc khi hủy, tùy chọn với các trạng thái khác)
     */
    public OrderStatusHistory(UUID orderId, String status,
                              UUID changedBy, String changedByType,
                              String reason) {
        this.orderId = orderId;
        this.status = status;
        this.changedBy = changedBy;
        this.changedByType = changedByType;
        this.reason = reason;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getStatus() {
        return status;
    }

    public UUID getChangedBy() {
        return changedBy;
    }

    public String getChangedByType() {
        return changedByType;
    }

    public String getReason() {
        return reason;
    }

    public OffsetDateTime getChangedAt() {
        return changedAt;
    }
}
