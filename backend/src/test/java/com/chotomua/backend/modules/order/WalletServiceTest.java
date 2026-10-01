package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.dto.WalletTopUpRequest;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class WalletServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final WalletTransactionRepository transactions = mock(WalletTransactionRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private WalletService service;

    @BeforeEach
    void setUp() {
        service = new WalletService(users, transactions, payments);
    }

    @Test
    void topUp_createsMatchingLedgerAndPaymentAndUpdatesBalance() {
        UUID userId = UUID.randomUUID();
        User user = new User("buyer", "hash");
        user.setWalletBalance(new BigDecimal("125.50"));
        when(users.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(transactions.save(any(WalletTransaction.class))).thenAnswer(call -> {
            WalletTransaction transaction = call.getArgument(0);
            setId(transaction, UUID.randomUUID());
            return transaction;
        });
        when(payments.save(any(Payment.class))).thenAnswer(call -> {
            Payment payment = call.getArgument(0);
            setId(payment, UUID.randomUUID());
            return payment;
        });

        var response = service.topUp(userId, new WalletTopUpRequest(new BigDecimal("50.25")));

        ArgumentCaptor<WalletTransaction> ledger = ArgumentCaptor.forClass(WalletTransaction.class);
        ArgumentCaptor<Payment> payment = ArgumentCaptor.forClass(Payment.class);
        verify(transactions).save(ledger.capture());
        verify(payments).save(payment.capture());
        assertThat(ledger.getValue().getType()).isEqualTo("topup");
        assertThat(ledger.getValue().getAmount()).isEqualByComparingTo("50.25");
        assertThat(payment.getValue().getWalletTransactionId()).isEqualTo(ledger.getValue().getId());
        assertThat(payment.getValue().getPurpose()).isEqualTo("wallet_topup");
        assertThat(payment.getValue().getMethod()).isEqualTo("bank_transfer");
        assertThat(payment.getValue().getStatus()).isEqualTo("paid");
        assertThat(payment.getValue().getAmount()).isEqualByComparingTo("50.25");
        assertThat(user.getWalletBalance()).isEqualByComparingTo("175.75");
        assertThat(response.balance()).isEqualByComparingTo("175.75");
        assertThat(response.simulated()).isTrue();
    }

    @Test
    void topUp_rejectsInvalidAmountBeforeWriting() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> service.topUp(userId, new WalletTopUpRequest(new BigDecimal("0.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.topUp(userId, new WalletTopUpRequest(new BigDecimal("1.001"))))
                .isInstanceOf(IllegalArgumentException.class);
        verify(users, never()).findByIdForUpdate(any());
        verify(transactions, never()).save(any());
        verify(payments, never()).save(any());
    }

    @Test
    void topUp_rejectsBalanceOverflowWithoutWriting() {
        UUID userId = UUID.randomUUID();
        User user = new User("buyer", "hash");
        user.setWalletBalance(new BigDecimal("9999999999.50"));
        when(users.findByIdForUpdate(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.topUp(userId, new WalletTopUpRequest(new BigDecimal("0.50"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vượt giới hạn");
        verify(transactions, never()).save(any());
        verify(payments, never()).save(any());
    }

    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
