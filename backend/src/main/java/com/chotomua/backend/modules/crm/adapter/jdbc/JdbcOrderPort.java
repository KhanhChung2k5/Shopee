package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Đơn hàng trên bảng {@code orders}. Mốc giao = lần chuyển sang {@code delivered} trong {@code order_status_histories}
 * (giống báo cáo doanh thu); đơn thiếu lịch sử thì dùng {@code created_at}.
 * Chỉ {@code SELECT} — không ghi bảng nhóm C.
 */
@Component
@Profile("!crm-fake")
public class JdbcOrderPort implements OrderPort {

    /** What the buyer actually kept paying for: the order total minus money already refunded (returns). */
    private static final String NET_AMOUNT = """
            (total_amount - COALESCE((SELECT SUM(r.refund_amount) FROM refund_returns r
                                      WHERE r.order_id = orders.id AND r.status = 'refunded'), 0))""";
    private static final String NET_TOTAL = NET_AMOUNT + " AS total_amount";
    /** An order whose goods all came back and were refunded is not a purchase: it does not count for RFM or LTV. */
    private static final String KEPT = NET_AMOUNT + " > 0";


    /** When the order was handed over: its last move to delivered, or the order date if no history row exists. */
    private static final String DELIVERED_AT = """
            COALESCE((SELECT MAX(h.changed_at) FROM order_status_histories h
                      WHERE h.order_id = orders.id AND h.status = 'delivered'), created_at) AS delivered_at""";

    private final JdbcTemplate jdbc;

    public JdbcOrderPort(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean existsOrder(UUID userId, UUID orderId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE id = ? AND user_id = ?",
                Integer.class,
                orderId,
                userId);
        return count != null && count > 0;
    }

    @Override
    public List<DeliveredOrderView> listDeliveredOrders(UUID userId) {
        List<OrderHeader> headers = jdbc.query("""
                SELECT id, user_id, created_at, %s, %s
                FROM orders
                WHERE user_id = ? AND status = 'delivered' AND %s
                ORDER BY created_at
                """.formatted(NET_TOTAL, DELIVERED_AT, KEPT), (rs, rowNum) -> header(rs), userId);
        return attachLines(headers);
    }

    /** Every customer's delivered orders in a couple of queries (chunks of 500 ids), not one round trip per customer. */
    @Override
    public Map<UUID, List<DeliveredOrderView>> listDeliveredOrdersByUser(Collection<UUID> userIds) {
        List<UUID> ids = copyIds(userIds);
        Map<UUID, List<DeliveredOrderView>> result = new LinkedHashMap<>();
        ids.forEach(id -> result.put(id, new ArrayList<>()));
        for (int from = 0; from < ids.size(); from += 500) {
            List<UUID> chunk = ids.subList(from, Math.min(ids.size(), from + 500));
            List<OrderHeader> headers = jdbc.query("""
                    SELECT id, user_id, created_at, %s, %s
                    FROM orders
                    WHERE user_id IN (%s) AND status = 'delivered' AND %s
                    ORDER BY created_at
                    """.formatted(NET_TOTAL, DELIVERED_AT, placeholders(chunk.size()), KEPT), (rs, rowNum) -> header(rs), chunk.toArray());
            for (DeliveredOrderView order : attachLines(headers)) {
                result.computeIfAbsent(order.userId(), key -> new ArrayList<>()).add(order);
            }
        }
        return result;
    }

    @Override
    public Optional<DeliveredOrderView> getDeliveredOrder(UUID orderId) {
        List<OrderHeader> found = jdbc.query("""
                SELECT id, user_id, created_at, %s, %s
                FROM orders
                WHERE id = ? AND status = 'delivered'
                """.formatted(NET_TOTAL, DELIVERED_AT), (rs, rowNum) -> header(rs), orderId);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(attachLines(found).getFirst());
    }

    @Override
    public Set<UUID> findBuyersOfProducts(Collection<UUID> productIds) {
        List<UUID> ids = copyIds(productIds);
        if (ids.isEmpty()) {
            return Set.of();
        }
        String sql = """
                SELECT DISTINCT o.user_id
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                WHERE o.status = 'delivered'
                  AND v.product_id IN (%s)
                ORDER BY o.user_id
                """.formatted(placeholders(ids.size()));
        List<UUID> buyers = jdbc.query(sql, (rs, rowNum) -> rs.getObject("user_id", UUID.class), ids.toArray());
        return new LinkedHashSet<>(buyers);
    }

    @Override
    public List<UUID> coPurchasedProducts(Collection<UUID> ownedProductIds, int limit) {
        List<UUID> owned = copyIds(ownedProductIds);
        if (owned.isEmpty() || limit <= 0) {
            return List.of();
        }
        String ownedIn = placeholders(owned.size());
        String sql = """
                SELECT pv.product_id
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants pv ON pv.id = oi.variant_id
                WHERE o.status = 'delivered'
                  AND o.id IN (
                      SELECT o2.id
                      FROM orders o2
                      JOIN order_items oi2 ON oi2.order_id = o2.id
                      JOIN product_variants pv2 ON pv2.id = oi2.variant_id
                      WHERE o2.status = 'delivered'
                        AND pv2.product_id IN (%s)
                  )
                  AND pv.product_id NOT IN (%s)
                GROUP BY pv.product_id
                ORDER BY COUNT(DISTINCT o.id) DESC, pv.product_id
                LIMIT ?
                """.formatted(ownedIn, ownedIn);
        List<Object> args = new ArrayList<>();
        args.addAll(owned);
        args.addAll(owned);
        args.add(limit);
        return jdbc.query(sql, (rs, rowNum) -> rs.getObject("product_id", UUID.class), args.toArray());
    }

    @Override
    public OpenWork openWork(UUID userId) {
        Integer orders = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE user_id = ? AND status NOT IN ('delivered', 'cancelled')",
                Integer.class, userId);
        Integer refunds = jdbc.queryForObject("""
                SELECT COUNT(*) FROM refund_returns r JOIN orders o ON o.id = r.order_id
                WHERE o.user_id = ? AND r.status IN ('requested', 'approved')
                """, Integer.class, userId);
        return new OpenWork(orders == null ? 0 : orders, refunds == null ? 0 : refunds);
    }

    /**
     * Gom dòng hàng sau khi ResultSet đơn đã đóng. Không query lồng trong mapper —
     * mapper giữ kết nối, query con lấy kết nối thứ hai và dễ cạn pool Hikari.
     */
    private List<DeliveredOrderView> attachLines(List<OrderHeader> headers) {
        if (headers.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<DeliveredOrderLine>> lines = linesOf(headers.stream().map(OrderHeader::id).toList());
        List<DeliveredOrderView> result = new ArrayList<>();
        for (OrderHeader header : headers) {
            result.add(new DeliveredOrderView(
                    header.id(),
                    header.userId(),
                    header.totalAmount(),
                    header.deliveredAt(),
                    List.copyOf(lines.getOrDefault(header.id(), List.of())),
                    header.placedAt()));
        }
        return result;
    }

    private Map<UUID, List<DeliveredOrderLine>> linesOf(List<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        String sql = """
                SELECT oi.order_id, p.id AS product_id, c.id AS category_id, c.name AS category_name,
                       oi.line_total, p.genre,
                       COALESCE(NULLIF(BTRIM(oi.product_name_snapshot), ''), p.name) AS product_name,
                       oi.quantity
                FROM order_items oi
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE oi.order_id IN (%s)
                ORDER BY oi.order_id
                """.formatted(placeholders(orderIds.size()));
        Map<UUID, List<DeliveredOrderLine>> grouped = new LinkedHashMap<>();
        jdbc.query(sql, (rs, rowNum) -> {
            UUID orderId = rs.getObject("order_id", UUID.class);
            int quantity = rs.getInt("quantity");
            if (rs.wasNull() || quantity < 1) {
                quantity = 1;
            }
            grouped.computeIfAbsent(orderId, key -> new ArrayList<>()).add(new DeliveredOrderLine(
                    rs.getObject("product_id", UUID.class),
                    rs.getObject("category_id", UUID.class),
                    rs.getString("category_name"),
                    rs.getObject("line_total", BigDecimal.class),
                    rs.getString("genre"),
                    rs.getString("product_name"),
                    quantity));
            return orderId;
        }, orderIds.toArray());
        return grouped;
    }

    private static OrderHeader header(ResultSet rs) throws SQLException {
        return new OrderHeader(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getBigDecimal("total_amount"),
                rs.getTimestamp("delivered_at"),
                rs.getTimestamp("created_at"));
    }

    private record OrderHeader(UUID id, UUID userId, BigDecimal totalAmount, Timestamp deliveredAtTimestamp,
                               Timestamp placedAtTimestamp) {
        Instant deliveredAt() {
            return deliveredAtTimestamp == null ? null : deliveredAtTimestamp.toInstant();
        }

        Instant placedAt() {
            return placedAtTimestamp == null ? null : placedAtTimestamp.toInstant();
        }
    }

    private static List<UUID> copyIds(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return List.copyOf(ids);
    }

    private static String placeholders(int count) {
        return String.join(",", Collections.nCopies(count, "?"));
    }
}
