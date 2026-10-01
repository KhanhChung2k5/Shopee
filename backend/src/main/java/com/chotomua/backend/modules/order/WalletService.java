package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.dto.WalletBalanceResponse;
import com.chotomua.backend.modules.order.dto.WalletTopUpRequest;
import com.chotomua.backend.modules.order.dto.WalletTopUpResponse;
import com.chotomua.backend.modules.order.dto.WalletTransactionResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletService {

    private static final BigDecimal MAX_BALANCE = new BigDecimal("9999999999.99");

    private final UserRepository userRepository;
    private final WalletTransactionRepository transactionRepository;
    private final PaymentRepository paymentRepository;

    public WalletService(UserRepository userRepository, WalletTransactionRepository transactionRepository,
                         PaymentRepository paymentRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public WalletBalanceResponse balance(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));
        return new WalletBalanceResponse(user.getWalletBalance());
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> transactions(UUID userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId).stream()
                .map(WalletTransactionResponse::from)
                .toList();
    }

    /** Simulated payment: balance, ledger entry and payment row commit atomically. */
    @Transactional
    public WalletTopUpResponse topUp(UUID userId, WalletTopUpRequest request) {
        BigDecimal amount = request.amount();
        if (amount == null || amount.signum() <= 0 || amount.scale() > 2 || amount.compareTo(MAX_BALANCE) > 0) {
            throw new IllegalArgumentException("Số tiền nạp phải từ 0,01 đến 9.999.999.999,99 và tối đa 2 chữ số thập phân");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));
        BigDecimal newBalance = user.getWalletBalance().add(amount);
        if (newBalance.compareTo(MAX_BALANCE) > 0) {
            throw new IllegalArgumentException("Số dư ví sẽ vượt giới hạn cho phép");
        }

        WalletTransaction transaction = transactionRepository.save(WalletTransaction.topUp(userId, amount));
        Payment payment = paymentRepository.save(Payment.simulatedWalletTopUp(userId, transaction.getId(), amount));
        user.setWalletBalance(newBalance);

        return new WalletTopUpResponse(payment.getId(), payment.getStatus(),
                WalletTransactionResponse.from(transaction), newBalance, true);
    }
}
