package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Đơn hàng trên bảng {@code orders}. Mốc giao lấy {@code created_at} vì schema không có cột delivered_at.
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
        return jdbc.query("""
                SELECT id, user_id, total_amount, created_at
                FROM orders
                WHERE user_id = ? AND status = 'delivered'
                ORDER BY created_at
                """, (rs, rowNum) -> {
            UUID orderId = rs.getObject("id", UUID.class);
            Timestamp createdAt = rs.getTimestamp("created_at");
            Instant deliveredAt = createdAt == null ? null : createdAt.toInstant();
            return new DeliveredOrderView(
                    orderId,
                    rs.getObject("user_id", UUID.class),
                    rs.getBigDecimal("total_amount"),
                    deliveredAt,
                    linesOf(orderId));
        }, userId);
    }

    private List<DeliveredOrderLine> linesOf(UUID orderId) {
        return jdbc.query("""
                SELECT p.id AS product_id, c.id AS category_id, c.name AS category_name,
                       oi.line_total, p.genre
                FROM order_items oi
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE oi.order_id = ?
                """, (rs, rowNum) -> new DeliveredOrderLine(
                rs.getObject("product_id", UUID.class),
                rs.getObject("category_id", UUID.class),
                rs.getString("category_name"),
                rs.getObject("line_total", BigDecimal.class),
                rs.getString("genre")), orderId);
    }
}
