package com.chotomua.backend.modules.marketing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "voucher_usages")
public class VoucherUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "voucher_id", nullable = false)
    private UUID voucherId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt = OffsetDateTime.now();

    protected VoucherUsage() {
    }

    public VoucherUsage(UUID voucherId, UUID userId, UUID orderId) {
        this.voucherId = Objects.requireNonNull(voucherId);
        this.userId = Objects.requireNonNull(userId);
        this.orderId = Objects.requireNonNull(orderId);
    }

    public UUID getId() { return id; }
    public UUID getVoucherId() { return voucherId; }
    public UUID getUserId() { return userId; }
    public UUID getOrderId() { return orderId; }
    public OffsetDateTime getUsedAt() { return usedAt; }
}
