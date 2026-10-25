package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A payment follows its order: COD / transfer is collected on delivery and voided when the order is cancelled. */
class CheckoutPaymentLifecycleTest {

    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final CheckoutPaymentService service = new CheckoutPaymentService(payments);
    private final UUID orderId = UUID.randomUUID();

    @Test
    void codAndTransferArePendingUntilDeliveredAndVoidedWhenCancelled() {
        Payment cod = Payment.checkout(orderId, "cod", new BigDecimal("500000"));
        Payment transfer = Payment.checkout(orderId, "bank_transfer", new BigDecimal("500000"));
        assertThat(cod.getStatus()).isEqualTo("pending");
        assertThat(transfer.getStatus()).isEqualTo("pending");

        when(payments.findByOrderIdAndPurpose(orderId, "checkout")).thenReturn(List.of(cod));
        service.settleOnDelivery(orderId);
        assertThat(cod.getStatus()).isEqualTo("paid");
        assertThat(cod.getPaidAt()).isNotNull();

        when(payments.findByOrderIdAndPurpose(orderId, "checkout")).thenReturn(List.of(transfer));
        service.cancelForOrder(orderId);
        assertThat(transfer.getStatus()).isEqualTo("cancelled");
        assertThat(transfer.getPaidAt()).isNull();
    }

    @Test
    void deliveryNeverSettlesABankTransferOnlySalesConfirmationDoes() {
        Payment transfer = Payment.checkout(orderId, "bank_transfer", new BigDecimal("500000"));
        when(payments.findByOrderIdAndPurpose(orderId, "checkout")).thenReturn(List.of(transfer));

        service.settleOnDelivery(orderId);
        assertThat(transfer.getStatus()).isEqualTo("pending");
        assertThat(service.awaitsTransfer(orderId)).isTrue();

        service.confirmTransferReceived(orderId);
        assertThat(transfer.getStatus()).isEqualTo("paid");
        assertThat(service.awaitsTransfer(orderId)).isFalse();
    }

    @Test
    void moneyArrivingAfterTheOrderWasCancelledCanStillBeRecorded() {
        Payment transfer = Payment.checkout(orderId, "bank_transfer", new BigDecimal("500000"));
        when(payments.findByOrderIdAndPurpose(orderId, "checkout")).thenReturn(List.of(transfer));
        service.cancelForOrder(orderId);
        assertThat(transfer.getStatus()).isEqualTo("cancelled");

        service.confirmTransferReceived(orderId);

        assertThat(transfer.getStatus()).isEqualTo("paid");
    }

    @Test
    void aCollectedPaymentIsNotVoidedByALateCancel() {
        Payment cod = Payment.checkout(orderId, "cod", new BigDecimal("500000"));
        cod.markPaid();
        when(payments.findByOrderIdAndPurpose(orderId, "checkout")).thenReturn(List.of(cod));

        service.cancelForOrder(orderId);

        assertThat(cod.getStatus()).isEqualTo("paid");
    }
}
