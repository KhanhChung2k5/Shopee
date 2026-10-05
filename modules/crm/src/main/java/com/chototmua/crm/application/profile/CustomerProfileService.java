package com.chototmua.crm.application.profile;

import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import com.chototmua.crm.domain.profile.LifetimeValue;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.web.dto.CustomerProfileResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Tính lại hồ sơ CRM từ đơn {@code delivered}. Không dùng trạng thái {@code COMPLETED}.
 * Không ghi {@code LoyaltyPoint}. Khóa / xóa mềm khách không xóa hồ sơ.
 */
@Service
public class CustomerProfileService {

    private final IdentityPort identity;
    private final OrderPort orders;
    private final ProfileStore store;
    private final Clock clock;

    @Autowired
    public CustomerProfileService(IdentityPort identity, OrderPort orders, ProfileStore store) {
        this(identity, orders, store, Clock.systemDefaultZone());
    }

    /** Kiểm thử gắn đồng hồ cố định khi tính số ngày từ lần mua cuối. */
    CustomerProfileService(IdentityPort identity, OrderPort orders, ProfileStore store, Clock clock) {
        this.identity = identity;
        this.orders = orders;
        this.store = store;
        this.clock = clock;
    }

    /** Xem hồ sơ. Chưa tính lại thì trả số 0, nhãn {@code new}, chưa có mốc tính. */
    public CustomerProfileResponse get(UUID actorId, UUID userId) {
        identity.requireCrmStaff(actorId);
        CustomerView customer = identity.getCustomer(userId);
        CustomerProfileCRM profile = store.find(userId).orElseGet(() -> empty(customer.id()));
        return toResponse(customer, profile);
    }

    /**
     * Hook nội bộ cho nhóm đơn hàng khi đơn sang {@code delivered}.
     * Không kiểm tra phòng ban — lớp REST kiểm tra trước khi gọi.
     */
    public CustomerProfileCRM recalculate(UUID userId) {
        CustomerView customer = identity.getCustomer(userId);
        List<DeliveredOrderView> delivered = orders.listDeliveredOrders(userId);
        if (delivered == null) {
            delivered = List.of();
        }
        LifetimeValue.Snapshot value = LifetimeValue.snapshot(delivered, clock);
        CustomerProfileCRM profile = new CustomerProfileCRM(
                customer.id(),
                value.ltv(),
                delivered.size(),
                RfmClassifier.segment(
                        daysSince(value.lastPurchaseAt()),
                        delivered.size(),
                        value.historicalSpend()),
                value.lastPurchaseAt(),
                Instant.now(clock));
        store.save(profile);
        return profile;
    }

    /** Tính lại rồi trả hồ sơ. Quản trị, quản lý CRM hoặc CSKH. */
    public CustomerProfileResponse recalculate(UUID actorId, UUID userId) {
        identity.requireCrmStaff(actorId);
        CustomerProfileCRM profile = recalculate(userId);
        return toResponse(identity.getCustomer(userId), profile);
    }

    /** Hồ sơ mặc định khi chưa tính lại: LTV 0, nhãn lost, chưa có mốc. */
    private static CustomerProfileCRM empty(UUID userId) {
        return new CustomerProfileCRM(userId, BigDecimal.ZERO, 0, RfmClassifier.LOST, null, null);
    }

    /** Số ngày từ lần giao hàng gần nhất; chưa mua thì {@code null}. */
    private Integer daysSince(Instant lastPurchaseAt) {
        if (lastPurchaseAt == null) {
            return null;
        }
        long days = ChronoUnit.DAYS.between(lastPurchaseAt, Instant.now(clock));
        return (int) Math.max(days, 0);
    }

    /** Ghép tên/trạng thái từ danh tính với số liệu CRM đã lưu. */
    private static CustomerProfileResponse toResponse(CustomerView customer, CustomerProfileCRM profile) {
        return new CustomerProfileResponse(
                customer.id(),
                customer.fullName(),
                customer.status(),
                profile.ltv(),
                profile.totalOrders(),
                profile.rfmSegment(),
                profile.lastPurchaseAt(),
                profile.calculatedAt());
    }
}
