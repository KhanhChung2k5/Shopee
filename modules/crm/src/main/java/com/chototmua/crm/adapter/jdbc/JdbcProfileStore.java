package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.profile.ProfileStore;
import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Hồ sơ CRM nằm trên {@code users} (ltv, total_orders, last_purchase_at, rfm_segment).
 * Schema không có cột thời điểm tính lại.
 */
@Component
@Profile("crm-db")
public class JdbcProfileStore implements ProfileStore {

    private final JdbcTemplate jdbc;

    public JdbcProfileStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void save(CustomerProfileCRM profile) {
        LocalDate lastPurchase = profile.lastPurchaseAt() == null
                ? null
                : profile.lastPurchaseAt().atZone(ZoneOffset.UTC).toLocalDate();
        jdbc.update("""
                UPDATE users
                SET ltv = ?, total_orders = ?, last_purchase_at = ?, rfm_segment = ?
                WHERE id = ?
                """,
                profile.ltv(),
                profile.totalOrders(),
                lastPurchase == null ? null : Date.valueOf(lastPurchase),
                profile.rfmSegment(),
                profile.userId());
    }

    @Override
    public Optional<CustomerProfileCRM> find(UUID userId) {
        List<CustomerProfileCRM> rows = jdbc.query("""
                SELECT id, ltv, total_orders, last_purchase_at, rfm_segment
                FROM users
                WHERE id = ?
                """, (rs, rowNum) -> {
            Date lastPurchase = rs.getDate("last_purchase_at");
            Instant lastPurchaseAt = lastPurchase == null
                    ? null
                    : lastPurchase.toLocalDate().atStartOfDay().toInstant(ZoneOffset.UTC);
            String rfm = rs.getString("rfm_segment");
            return new CustomerProfileCRM(
                    rs.getObject("id", UUID.class),
                    rs.getBigDecimal("ltv"),
                    rs.getInt("total_orders"),
                    rfm,
                    lastPurchaseAt,
                    null);
        }, userId);
        if (rows.isEmpty() || rows.getFirst().rfmSegment() == null) {
            return Optional.empty();
        }
        return Optional.of(rows.getFirst());
    }
}
