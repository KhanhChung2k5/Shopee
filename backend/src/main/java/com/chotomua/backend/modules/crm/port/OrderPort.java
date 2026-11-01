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

    /**
     * Đơn đã giao của nhiều khách một lần (báo cáo). Mặc định gọi từng khách; bản JDBC ghi đè bằng truy vấn theo lô
     * để không phải đi tới DB một lần cho mỗi khách.
     */
    default java.util.Map<UUID, List<DeliveredOrderView>> listDeliveredOrdersByUser(Collection<UUID> userIds) {
        java.util.Map<UUID, List<DeliveredOrderView>> result = new java.util.HashMap<>();
        for (UUID userId : userIds) {
            List<DeliveredOrderView> delivered = listDeliveredOrders(userId);
            result.put(userId, delivered == null ? List.of() : delivered);
        }
        return result;
    }

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

    /**
     * Việc còn dang dở với khách: đơn chưa giao xong/chưa hủy và yêu cầu hoàn tiền chưa kết thúc.
     * Khóa hay xóa khách khi còn những việc này sẽ bỏ lửng giao hàng hoặc tiền hoàn.
     */
    default OpenWork openWork(UUID userId) {
        return new OpenWork(0, 0);
    }

    record OpenWork(int openOrders, int openRefunds) {
        public boolean any() {
            return openOrders > 0 || openRefunds > 0;
        }

        /** "2 đơn chưa hoàn tất và 1 yêu cầu hoàn tiền chưa xử lý xong" (chỉ phần khác 0). */
        public String describe() {
            String ordersText = openOrders > 0 ? openOrders + " đơn chưa hoàn tất" : "";
            String refundsText = openRefunds > 0 ? openRefunds + " yêu cầu hoàn tiền chưa xử lý xong" : "";
            return ordersText.isEmpty() ? refundsText : refundsText.isEmpty() ? ordersText : ordersText + " và " + refundsText;
        }
    }
}
