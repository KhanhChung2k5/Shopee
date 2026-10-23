package com.chotomua.backend.modules.crm.port;

import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Cổng sang đơn hàng (nhóm C).
 * Không duyệt đổi trả, không đánh giá, không áp mã giảm — những việc đó không thuộc CRM.
 */
public interface OrderPort {

    /** True khi đơn thuộc đúng khách này (dùng khi mở hội thoại gắn đơn). */
    boolean existsOrder(UUID userId, UUID orderId);

    /** Chỉ đơn đã giao ({@code delivered}) — không dùng trạng thái {@code COMPLETED}. */
    List<DeliveredOrderView> listDeliveredOrders(UUID userId);

    /** Một đơn đã giao theo mã; đơn chưa delivered hoặc không có thì empty. */
    Optional<DeliveredOrderView> getDeliveredOrder(UUID orderId);

    /**
     * Khách có ít nhất một đơn {@code delivered} chứa một trong các sản phẩm.
     * Không trùng user.
     */
    Set<UUID> findBuyersOfProducts(Collection<UUID> productIds);

    /**
     * Sản phẩm hay mua chung (cùng giỏ đơn delivered toàn hệ) với tập đã sở hữu.
     * Loại sản phẩm đã sở hữu, xếp theo tần suất giảm dần, cắt {@code limit}.
     */
    List<UUID> coPurchasedProducts(Collection<UUID> ownedProductIds, int limit);
}
