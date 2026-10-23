package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import tools.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Đọc catalog teammate. Sản phẩm đang bán = {@code products.status = published}.
 * Chỉ {@code SELECT} — không ghi bảng nhóm B/C.
 */
@Component
@Profile("!crm-fake")
public class JdbcProductPort implements ProductPort {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String PRODUCT_SELECT = """
            SELECT p.id, p.name, p.brand_name, p.product_type, p.category_id,
                   c.name AS category_name, p.genre, p.platforms::text AS platforms,
                   (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id) AS price,
                   p.status
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            """;

    private final JdbcTemplate jdbc;

    public JdbcProductPort(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean existsActive(UUID productId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM products WHERE id = ? AND status = 'published'",
                Integer.class,
                productId);
        return count != null && count > 0;
    }

    @Override
    public Optional<ProductView> find(UUID productId) {
        List<ProductView> found = jdbc.query(
                PRODUCT_SELECT + " WHERE p.id = ?",
                (rs, rowNum) -> mapProduct(rs),
                productId);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(found.getFirst());
    }

    @Override
    public List<ProductView> search(ProductFilter filter) {
        ProductFilter criteria = filter == null
                ? new ProductFilter(null, null, null, null, null, null, null, false)
                : filter;
        StringBuilder sql = new StringBuilder(PRODUCT_SELECT);
        sql.append(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (criteria.keyword() != null) {
            sql.append(" AND (lower(p.name) LIKE ? OR lower(coalesce(p.brand_name, '')) LIKE ?)");
            String needle = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
            args.add(needle);
            args.add(needle);
        }
        if (criteria.productType() != null) {
            sql.append(" AND lower(p.product_type) = lower(?)");
            args.add(criteria.productType());
        }
        if (criteria.categoryId() != null) {
            sql.append(" AND p.category_id = ?");
            args.add(criteria.categoryId());
        }
        if (criteria.genre() != null) {
            sql.append(" AND lower(p.genre) = lower(?)");
            args.add(criteria.genre());
        }
        if (criteria.platform() != null) {
            sql.append("""
                     AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(coalesce(p.platforms, '[]'::jsonb)) plat
                        WHERE lower(plat) = lower(?)
                     )
                    """);
            args.add(criteria.platform());
        }
        if (criteria.priceMin() != null) {
            sql.append("""
                     AND (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id) >= ?
                    """);
            args.add(criteria.priceMin());
        }
        if (criteria.priceMax() != null) {
            sql.append("""
                     AND (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id) <= ?
                    """);
            args.add(criteria.priceMax());
        }
        if (criteria.publishedOnly()) {
            sql.append(" AND p.status = 'published'");
        }
        sql.append(" ORDER BY p.name, p.id");
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapProduct(rs), args.toArray());
    }

    @Override
    public List<ProductView> topSellers(Instant from, Instant to, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        StringBuilder sql = new StringBuilder("""
                SELECT p.id, p.name, p.brand_name, p.product_type, p.category_id,
                       c.name AS category_name, p.genre, p.platforms::text AS platforms,
                       (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id) AS price,
                       p.status
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants pv ON pv.id = oi.variant_id
                JOIN products p ON p.id = pv.product_id
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE o.status = 'delivered'
                """);
        List<Object> args = new ArrayList<>();
        if (from != null) {
            sql.append(" AND o.created_at >= ?");
            args.add(timestamp(from));
        }
        if (to != null) {
            sql.append(" AND o.created_at <= ?");
            args.add(timestamp(to));
        }
        sql.append("\n").append("""
                GROUP BY p.id, p.name, p.brand_name, p.product_type, p.category_id,
                         c.name, p.genre, p.platforms, p.status
                ORDER BY SUM(oi.quantity) DESC, p.name, p.id
                LIMIT ?
                """);
        args.add(limit);
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapProduct(rs), args.toArray());
    }

    private static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static ProductView mapProduct(ResultSet rs) throws SQLException {
        return new ProductView(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("brand_name"),
                rs.getString("product_type"),
                rs.getObject("category_id", UUID.class),
                rs.getString("category_name"),
                rs.getString("genre"),
                parsePlatforms(rs.getString("platforms")),
                rs.getObject("price", BigDecimal.class),
                rs.getString("status"));
    }

    private static List<String> parsePlatforms(String raw) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            return List.of();
        }
        try {
            String[] values = JSON.readValue(raw, String[].class);
            return values == null ? List.of() : List.of(values);
        } catch (Exception ignored) {
            return List.of();
        }
    }
}
