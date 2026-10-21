package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
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
 * Đơn hàng trên bảng {@code orders}. Mốc giao lấy {@code created_at} vì schema không có cột delivered_at.
 * Chỉ {@code SELECT} — không ghi bảng nhóm C.
 */
@Component
@Profile("crm-db")
public class JdbcOrderPort implements OrderPort {

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
                SELECT id, user_id, total_amount, created_at
                FROM orders
                WHERE user_id = ? AND status = 'delivered'
                ORDER BY created_at
                """, (rs, rowNum) -> header(rs), userId);
        return attachLines(headers);
    }

    @Override
    public Optional<DeliveredOrderView> getDeliveredOrder(UUID orderId) {
        List<OrderHeader> found = jdbc.query("""
                SELECT id, user_id, total_amount, created_at
                FROM orders
                WHERE id = ? AND status = 'delivered'
                """, (rs, rowNum) -> header(rs), orderId);
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
                    List.copyOf(lines.getOrDefault(header.id(), List.of()))));
        }
        return result;
    }

    private Map<UUID, List<DeliveredOrderLine>> linesOf(List<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        String sql = """
                SELECT oi.order_id, p.id AS product_id, c.id AS category_id, c.name AS category_name,
                       oi.line_total, p.genre
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
            grouped.computeIfAbsent(orderId, key -> new ArrayList<>()).add(new DeliveredOrderLine(
                    rs.getObject("product_id", UUID.class),
                    rs.getObject("category_id", UUID.class),
                    rs.getString("category_name"),
                    rs.getObject("line_total", BigDecimal.class),
                    rs.getString("genre")));
            return orderId;
        }, orderIds.toArray());
        return grouped;
    }

    private static OrderHeader header(ResultSet rs) throws SQLException {
        return new OrderHeader(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getBigDecimal("total_amount"),
                rs.getTimestamp("created_at"));
    }

    private record OrderHeader(UUID id, UUID userId, BigDecimal totalAmount, Timestamp createdAt) {
        Instant deliveredAt() {
            return createdAt == null ? null : createdAt.toInstant();
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
