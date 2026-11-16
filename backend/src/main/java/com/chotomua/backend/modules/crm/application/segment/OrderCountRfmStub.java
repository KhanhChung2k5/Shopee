package com.chotomua.backend.modules.crm.application.segment;

import com.chotomua.backend.modules.crm.application.profile.ProfileStore;
import com.chotomua.backend.modules.crm.domain.profile.CustomerProfileCRM;
import com.chotomua.backend.modules.crm.domain.profile.LifetimeValue;
import com.chotomua.backend.modules.crm.domain.profile.RfmClassifier;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
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

    /** Recency từ lần giao cuối; frequency và monetary chỉ trong 365 ngày gần nhất. */
    private String classify(List<DeliveredOrderView> delivered) {
        if (delivered == null || delivered.isEmpty()) {
            return RfmClassifier.segment(null, 0, BigDecimal.ZERO);
        }
        LifetimeValue.Snapshot value = LifetimeValue.snapshot(delivered, clock);
        Integer days = null;
        if (value.lastPurchaseAt() != null) {
            days = (int) Math.max(ChronoUnit.DAYS.between(value.lastPurchaseAt(), Instant.now(clock)), 0);
        }
        return RfmClassifier.segment(days, value.windowOrderCount(), value.windowSpend());
    }
}
