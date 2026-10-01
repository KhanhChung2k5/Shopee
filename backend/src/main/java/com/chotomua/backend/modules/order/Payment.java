package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "wallet_transaction_id")
    private UUID walletTransactionId;

    @Column(nullable = false, length = 20)
    private String purpose;

    @Column(length = 20)
    private String method;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    protected Payment() {
    }

    public static Payment simulatedWalletTopUp(UUID userId, UUID walletTransactionId, BigDecimal amount) {
        Payment payment = new Payment();
        payment.userId = userId;
        payment.walletTransactionId = walletTransactionId;
        payment.purpose = "wallet_topup";
        payment.method = "bank_transfer";
        payment.amount = amount;
        payment.status = "paid";
        payment.paidAt = OffsetDateTime.now();
        return payment;
    }

    public UUID getId() {
        return id;
    }

    public UUID getWalletTransactionId() {
        return walletTransactionId;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getMethod() {
        return method;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getStatus() {
        return status;
    }
}
