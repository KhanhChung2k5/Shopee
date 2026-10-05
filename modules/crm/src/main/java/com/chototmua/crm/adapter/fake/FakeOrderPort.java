package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Bản giả lập đơn hàng: chỉ biết đơn tồn tại và các đơn đã giao đã gieo.
 */
@Component
@Profile("crm-fake")
public class FakeOrderPort implements OrderPort {

    private final Set<String> existingOrders = new HashSet<>();
    private final List<DeliveredOrderView> deliveredOrders = new ArrayList<>();

    /** Ghi nhận một đơn thuộc khách (chưa cần đã giao). */
    public void seedOrder(UUID userId, UUID orderId) {
        existingOrders.add(key(userId, orderId));
    }

    /** Ghi nhận đơn đã giao — dùng tính hồ sơ CRM / khảo sát sau mua. */
    public void seedDeliveredOrder(DeliveredOrderView order) {
        seedOrder(order.userId(), order.orderId());
        deliveredOrders.add(order);
    }

    /** Xóa đơn giả giữa các bài kiểm tra để không lẫn số liệu báo cáo. */
    public void reset() {
        existingOrders.clear();
        deliveredOrders.clear();
    }

    @Override
    public boolean existsOrder(UUID userId, UUID orderId) {
        return existingOrders.contains(key(userId, orderId));
    }

    @Override
    public List<DeliveredOrderView> listDeliveredOrders(UUID userId) {
        return deliveredOrders.stream()
                .filter(order -> order.userId().equals(userId))
                .toList();
    }

    private static String key(UUID userId, UUID orderId) {
        return userId + ":" + orderId;
    }
}
