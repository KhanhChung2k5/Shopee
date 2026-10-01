package com.chotomua.backend.modules.order;

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
@Table(name = "refund_returns")
public class RefundReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_item_id", nullable = false)
    private UUID orderItemId;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "wallet_transaction_id")
    private UUID walletTransactionId;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, length = 20)
    private String status = "requested";

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt = OffsetDateTime.now();

    protected RefundReturn() {
    }

    public RefundReturn(UUID orderItemId, String reason) {
        this.orderItemId = Objects.requireNonNull(orderItemId);
        this.reason = reason;
    }

    public UUID getId() { return id; }
    public UUID getOrderItemId() { return orderItemId; }
    public UUID getEmployeeId() { return employeeId; }
    public UUID getWalletTransactionId() { return walletTransactionId; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
}
