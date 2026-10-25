package com.chotomua.backend.modules.order;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every 15 minutes: cancel bank-transfer orders whose money has not arrived within
 * {@link OrderService#TRANSFER_DEADLINE}, so they stop holding stock and flash-sale units.
 * One transaction per order — a failure on one does not undo the others.
 */
@Component
public class UnpaidTransferExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(UnpaidTransferExpiryJob.class);

    private final OrderService orders;

    public UnpaidTransferExpiryJob(OrderService orders) {
        this.orders = orders;
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
    public void run() {
        int cancelled = 0;
        for (UUID orderId : orders.findExpiredTransferOrders(OffsetDateTime.now())) {
            try {
                if (orders.expireUnpaidTransfer(orderId)) cancelled++;
            } catch (RuntimeException e) {
                log.warn("Could not auto-cancel unpaid transfer order {}", orderId, e);
            }
        }
        if (cancelled > 0) log.info("Auto-cancelled {} unpaid bank-transfer order(s)", cancelled);
    }
}
