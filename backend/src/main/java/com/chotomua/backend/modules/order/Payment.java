package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    private UUID id;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "user_id")
    private UUID userId;

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

    /** COD and bank transfer are collected later — marked paid when the order is delivered (CheckoutPaymentService.settleOnDelivery). */
    public static Payment checkout(UUID orderId, String method, BigDecimal amount) {
        Payment payment = new Payment();
        payment.id = UUID.randomUUID();
        payment.orderId = orderId;
        payment.purpose = "checkout";
        payment.method = method;
        payment.amount = amount;
        payment.status = "pending";
        return payment;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
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

    public UUID getOrderId() {
        return orderId;
    }

    public OffsetDateTime getPaidAt() {
        return paidAt;
    }

    /** COD / bank transfer collected (order delivered). */
    public void markPaid() {
        status = "paid";
        if (paidAt == null) paidAt = OffsetDateTime.now();
    }

    /** Order cancelled before anything was collected. */
    public void markCancelled() {
        status = "cancelled";
    }

    /** Money handed back to the buyer by bank transfer — all of it, or only part (some lines returned). */
    public void markRefunded(boolean full) {
        status = full ? "refunded" : "partially_refunded";
    }
}
