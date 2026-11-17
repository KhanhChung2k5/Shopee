package com.chototmua.crm.application.segment;

import com.chototmua.crm.application.profile.ProfileStore;
import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Nguồn nhãn RFM cho phân khúc. Đã có hồ sơ CRM thì đọc {@code rfmSegment} đã tính lại.
 * Chưa tính thì chấm từ đơn {@code delivered}.
 */
@Component
public class OrderCountRfmStub implements RfmSegmentSource {

    private final OrderPort orders;
    private final ProfileStore profiles;
    private final Clock clock;

    public OrderCountRfmStub(OrderPort orders) {
        this(orders, null, Clock.systemDefaultZone());
    }

    @Autowired
    public OrderCountRfmStub(OrderPort orders, ProfileStore profiles) {
        this(orders, profiles, Clock.systemDefaultZone());
    }

    public OrderCountRfmStub(OrderPort orders, ProfileStore profiles, Clock clock) {
        this.orders = orders;
        this.profiles = profiles;
        this.clock = clock;
    }

    /** Ưu tiên nhãn đã lưu trên hồ sơ; chưa có thì chấm từ đơn đã giao. */
    @Override
    public String rfmSegment(UUID userId) {
        if (profiles != null) {
            Optional<CustomerProfileCRM> stored = profiles.find(userId);
            if (stored.isPresent()) {
                return stored.get().rfmSegment();
            }
        }
        return classify(orders.listDeliveredOrders(userId));
    }

    /** Recency / frequency / monetary từ đơn {@code delivered}. */
    private String classify(List<DeliveredOrderView> delivered) {
        if (delivered == null || delivered.isEmpty()) {
            return RfmClassifier.segment(null, 0, BigDecimal.ZERO);
        }
        BigDecimal monetary = BigDecimal.ZERO;
        Instant lastPurchaseAt = null;
        for (DeliveredOrderView order : delivered) {
            if (order.totalAmount() != null) {
                monetary = monetary.add(order.totalAmount());
            }
            Instant deliveredAt = order.deliveredAt();
            if (deliveredAt != null && (lastPurchaseAt == null || deliveredAt.isAfter(lastPurchaseAt))) {
                lastPurchaseAt = deliveredAt;
            }
        }
        Integer days = null;
        if (lastPurchaseAt != null) {
            days = (int) Math.max(ChronoUnit.DAYS.between(lastPurchaseAt, Instant.now(clock)), 0);
        }
        return RfmClassifier.segment(days, delivered.size(), monetary);
    }
}
