package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Records one payment for every checkout and debits the wallet atomically when requested. */
@Service
public class CheckoutPaymentService {
    private final UserRepository users;
    private final WalletTransactionRepository walletTransactions;
    private final PaymentRepository payments;

    public CheckoutPaymentService(UserRepository users, WalletTransactionRepository walletTransactions,
                                  PaymentRepository payments) {
        this.users = users;
        this.walletTransactions = walletTransactions;
        this.payments = payments;
    }

    public Payment record(UUID userId, UUID orderId, String requestedMethod, BigDecimal amount) {
        String method = requestedMethod == null ? "cod" : requestedMethod;
        UUID walletTransactionId = null;
        if ("wallet".equals(method)) {
            User user = users.findByIdForUpdate(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));
            if (user.getWalletBalance().compareTo(amount) < 0) {
                throw new IllegalStateException("Số dư ví không đủ để thanh toán đơn hàng");
            }
            WalletTransaction transaction = walletTransactions.save(WalletTransaction.payment(userId, orderId, amount));
            user.setWalletBalance(user.getWalletBalance().subtract(amount));
            walletTransactionId = transaction.getId();
        }
        return payments.save(Payment.checkout(orderId, method, amount, walletTransactionId));
    }
}
