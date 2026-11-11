package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Override
    public Optional<DeliveredOrderView> getDeliveredOrder(UUID orderId) {
        return deliveredOrders.stream()
                .filter(order -> order.orderId().equals(orderId))
                .findFirst();
    }

    @Override
    public Set<UUID> findBuyersOfProducts(Collection<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Set.of();
        }
        Set<UUID> targets = Set.copyOf(productIds);
        Set<UUID> buyers = new LinkedHashSet<>();
        for (DeliveredOrderView order : deliveredOrders) {
            boolean bought = order.lines().stream()
                    .map(DeliveredOrderLine::productId)
                    .anyMatch(targets::contains);
            if (bought) {
                buyers.add(order.userId());
            }
        }
        return buyers;
    }

    @Override
    public List<UUID> coPurchasedProducts(Collection<UUID> ownedProductIds, int limit) {
        if (ownedProductIds == null || ownedProductIds.isEmpty() || limit <= 0) {
            return List.of();
        }
        Set<UUID> owned = Set.copyOf(ownedProductIds);
        Map<UUID, Integer> frequency = new HashMap<>();
        for (DeliveredOrderView order : deliveredOrders) {
            Set<UUID> inOrder = order.lines().stream()
                    .map(DeliveredOrderLine::productId)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (inOrder.stream().noneMatch(owned::contains)) {
                continue;
            }
            for (UUID productId : inOrder) {
                if (!owned.contains(productId)) {
                    frequency.merge(productId, 1, Integer::sum);
                }
            }
        }
        return frequency.entrySet().stream()
                .sorted(Comparator.<Map.Entry<UUID, Integer>>comparingInt(Map.Entry::getValue).reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static String key(UUID userId, UUID orderId) {
        return userId + ":" + orderId;
    }
}
