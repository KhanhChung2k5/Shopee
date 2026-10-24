package com.chotomua.backend.modules.order;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Records one payment for every checkout (COD or bank transfer) and follows it through delivery or cancellation. */
@Service
public class CheckoutPaymentService {
    private final PaymentRepository payments;

    public CheckoutPaymentService(PaymentRepository payments) {
        this.payments = payments;
    }

    public Payment record(UUID orderId, String requestedMethod, BigDecimal amount) {
        String method = requestedMethod == null ? "cod" : requestedMethod;
        return payments.save(Payment.checkout(orderId, method, amount));
    }

    /** Order delivered: cash on delivery / bank transfer counts as collected. */
    public void settleOnDelivery(UUID orderId) {
        for (Payment payment : payments.findByOrderIdAndPurpose(orderId, "checkout")) {
            if ("pending".equals(payment.getStatus())) payment.markPaid();
        }
    }

    /** Order cancelled before delivery: the payment that was never collected is voided. */
    public void cancelForOrder(UUID orderId) {
        for (Payment payment : payments.findByOrderIdAndPurpose(orderId, "checkout")) {
            if ("pending".equals(payment.getStatus())) payment.markCancelled();
        }
    }

    /**
     * Sales checked the bank statement: the buyer's transfer has arrived. From now on cancelling the order
     * means the money must be sent back (a refund is opened), not just voided.
     */
    public Payment confirmTransferReceived(UUID orderId) {
        Payment payment = checkoutPaymentOf(orderId)
                .orElseThrow(() -> new IllegalStateException("Đơn hàng chưa có thông tin thanh toán"));
        if (!"bank_transfer".equals(payment.getMethod())) {
            throw new IllegalStateException("Chỉ xác nhận nhận tiền cho đơn chuyển khoản");
        }
        if (!"pending".equals(payment.getStatus())) {
            throw new IllegalStateException("Thanh toán của đơn này đã được xử lý");
        }
        payment.markPaid();
        return payment;
    }

    /** After a refund was transferred: the payment is fully or partly refunded, by everything sent back so far. */
    public void recordRefunded(UUID orderId, BigDecimal refundedSoFar) {
        checkoutPaymentOf(orderId).ifPresent(payment ->
                payment.markRefunded(refundedSoFar.compareTo(payment.getAmount()) >= 0));
    }

    /** Checkout payment of an order, for the order detail screens. */
    public Optional<Payment> checkoutPaymentOf(UUID orderId) {
        return payments.findByOrderIdAndPurpose(orderId, "checkout").stream().findFirst();
    }
}
