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

/**
 * A refund the shop owes a buyer, paid back by hand (bank transfer) — there is no wallet.
 * "return": one delivered line sent back, reviewed by CS. "cancellation": a paid order was cancelled, approved from the start.
 */
@Entity
@Table(name = "refund_returns")
public class RefundReturn {

    public static final String RETURN = "return";
    public static final String CANCELLATION = "cancellation";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "order_item_id")
    private UUID orderItemId;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, length = 20)
    private String status = "requested";

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_no", length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "staff_note", length = 500)
    private String staffNote;

    @Column(name = "transfer_ref", length = 100)
    private String transferRef;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt = OffsetDateTime.now();

    @Column(name = "handled_at")
    private OffsetDateTime handledAt;

    @Column(name = "refunded_at")
    private OffsetDateTime refundedAt;

    protected RefundReturn() {
    }

    /** Buyer sends a delivered line back; CS still has to approve it. */
    public static RefundReturn forReturn(UUID orderId, UUID orderItemId, String reason, BigDecimal amount) {
        RefundReturn refund = new RefundReturn();
        refund.orderId = Objects.requireNonNull(orderId);
        refund.orderItemId = Objects.requireNonNull(orderItemId);
        refund.kind = RETURN;
        refund.reason = reason;
        refund.refundAmount = amount;
        return refund;
    }

    /** A paid order was cancelled: the whole payment is owed back, no review needed. */
    public static RefundReturn forCancellation(UUID orderId, String reason, BigDecimal amount) {
        RefundReturn refund = new RefundReturn();
        refund.orderId = Objects.requireNonNull(orderId);
        refund.kind = CANCELLATION;
        refund.reason = reason;
        refund.refundAmount = amount;
        refund.status = "approved";
        return refund;
    }

    public void setBankAccount(String bankName, String accountNo, String accountName) {
        this.bankName = bankName;
        this.bankAccountNo = accountNo;
        this.bankAccountName = accountName;
    }

    public boolean hasBankAccount() {
        return bankName != null && bankAccountNo != null && bankAccountName != null;
    }

    public void approve(UUID employeeId) {
        this.employeeId = employeeId;
        this.status = "approved";
        this.handledAt = OffsetDateTime.now();
    }

    public void reject(UUID employeeId, String note) {
        this.employeeId = employeeId;
        this.staffNote = note;
        this.status = "rejected";
        this.handledAt = OffsetDateTime.now();
    }

    public void markRefunded(UUID employeeId, String transferRef) {
        this.employeeId = employeeId;
        this.transferRef = transferRef;
        this.status = "refunded";
        this.refundedAt = OffsetDateTime.now();
        if (handledAt == null) handledAt = refundedAt;
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public UUID getOrderItemId() { return orderItemId; }
    public String getKind() { return kind; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public String getBankName() { return bankName; }
    public String getBankAccountNo() { return bankAccountNo; }
    public String getBankAccountName() { return bankAccountName; }
    public UUID getEmployeeId() { return employeeId; }
    public String getStaffNote() { return staffNote; }
    public String getTransferRef() { return transferRef; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public OffsetDateTime getHandledAt() { return handledAt; }
    public OffsetDateTime getRefundedAt() { return refundedAt; }
}
