package com.chotomua.backend.modules.report;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Management reports, read straight from the transaction tables.
 * <ul>
 *   <li>Revenue is recognised when an order is delivered (not when it is placed), net of the order's discounts;
 *       money refunded for returned goods is taken off on the day it was sent back.</li>
 *   <li>Cost of goods = weighted average unit cost of the variant over its approved goods receipts.
 *       Lines whose variant has no costed receipt are counted separately, so the profit is never invented.</li>
 *   <li>Stock in/out per period comes from inventory_movements; the closing balance is today's stock minus
 *       what moved after the period, so stock loaded without a movement still balances.</li>
 * </ul>
 * Days are calendar days in Vietnam time.
 */
@Service
public class ReportService {

    static final String TZ = "Asia/Ho_Chi_Minh";
    static final int MAX_DAYS = 366;

    private static final String AVG_COST = """
            avg_cost AS (
                SELECT gri.variant_id, SUM(gri.line_total) / NULLIF(SUM(gri.quantity), 0) AS unit_cost
                FROM goods_receipt_items gri
                JOIN goods_receipts g ON g.id = gri.receipt_id AND g.status = 'approved'
                GROUP BY gri.variant_id
            )""";

    /** Delivered orders with the moment they were delivered, inside [:start, :end). */
    private static final String DELIVERED = """
            delivered AS (
                SELECT o.id, o.total_amount, o.subtotal_amount, MAX(h.changed_at) AS delivered_at
                FROM orders o
                JOIN order_status_histories h ON h.order_id = o.id AND h.status = 'delivered'
                WHERE o.status = 'delivered'
                GROUP BY o.id
                HAVING MAX(h.changed_at) >= :start AND MAX(h.changed_at) < :end
            )""";

    private final NamedParameterJdbcTemplate jdbc;

    public ReportService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public RevenueReport revenue(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = period(from, to);
        Map<LocalDate, DayAcc> days = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) days.put(d, new DayAcc());

        jdbc.query("WITH " + DELIVERED + """
                SELECT (delivered_at AT TIME ZONE '%s')::date AS day, COUNT(*) AS orders, SUM(total_amount) AS revenue
                FROM delivered GROUP BY 1
                """.formatted(TZ), params, rs -> {
            DayAcc acc = days.get(rs.getDate("day").toLocalDate());
            if (acc == null) return;
            acc.orders = rs.getLong("orders");
            acc.revenue = rs.getBigDecimal("revenue");
        });

        jdbc.query("WITH " + AVG_COST + ", " + DELIVERED + """
                SELECT (d.delivered_at AT TIME ZONE '%s')::date AS day,
                       COALESCE(SUM(oi.quantity * c.unit_cost), 0) AS cogs,
                       COALESCE(SUM(oi.quantity) FILTER (WHERE c.unit_cost IS NULL), 0) AS uncosted
                FROM delivered d
                JOIN order_items oi ON oi.order_id = d.id
                LEFT JOIN avg_cost c ON c.variant_id = oi.variant_id
                GROUP BY 1
                """.formatted(TZ), params, rs -> {
            DayAcc acc = days.get(rs.getDate("day").toLocalDate());
            if (acc == null) return;
            acc.cogs = acc.cogs.add(rs.getBigDecimal("cogs"));
            acc.uncostedUnits += rs.getLong("uncosted");
        });

        // Returned goods: the refund leaves revenue on the day it is paid; restocked goods give their cost back.
        jdbc.query("""
                SELECT (r.refunded_at AT TIME ZONE '%s')::date AS day, SUM(r.refund_amount) AS refunded
                FROM refund_returns r
                WHERE r.kind = 'return' AND r.status = 'refunded' AND r.refunded_at >= :start AND r.refunded_at < :end
                GROUP BY 1
                """.formatted(TZ), params, rs -> {
            DayAcc acc = days.get(rs.getDate("day").toLocalDate());
            if (acc != null) acc.refunds = rs.getBigDecimal("refunded");
        });
        jdbc.query("WITH " + AVG_COST + """
                SELECT (r.received_at AT TIME ZONE '%s')::date AS day, COALESCE(SUM(oi.quantity * c.unit_cost), 0) AS cost
                FROM refund_returns r
                JOIN order_items oi ON oi.id = r.order_item_id
                LEFT JOIN avg_cost c ON c.variant_id = oi.variant_id
                WHERE r.restock_warehouse_id IS NOT NULL AND r.received_at >= :start AND r.received_at < :end
                GROUP BY 1
                """.formatted(TZ), params, rs -> {
            DayAcc acc = days.get(rs.getDate("day").toLocalDate());
            if (acc != null) acc.cogs = acc.cogs.subtract(rs.getBigDecimal("cost"));
        });

        List<RevenueReport.Day> series = new ArrayList<>();
        DayAcc total = new DayAcc();
        days.forEach((day, acc) -> {
            series.add(acc.toDay(day));
            total.orders += acc.orders;
            total.revenue = total.revenue.add(acc.revenue);
            total.refunds = total.refunds.add(acc.refunds);
            total.cogs = total.cogs.add(acc.cogs);
            total.uncostedUnits += acc.uncostedUnits;
        });
        RevenueReport.Day sum = total.toDay(null);
        return new RevenueReport(from, to, sum.orders(), sum.revenue(), sum.refunds(), sum.netRevenue(), sum.cogs(),
                sum.grossProfit(), margin(sum.grossProfit(), sum.netRevenue()), sum.uncostedUnits(), series,
                topProducts(params));
    }

    /** Best sellers of the period by net revenue (each line's share of what its order really cost the buyer). */
    private List<RevenueReport.Product> topProducts(MapSqlParameterSource params) {
        return jdbc.query("WITH " + AVG_COST + ", " + DELIVERED + """
                SELECT pv.id AS variant_id, pv.sku, p.name, p.product_type,
                       SUM(oi.quantity) AS units,
                       SUM(CASE WHEN d.subtotal_amount > 0 THEN oi.line_total * d.total_amount / d.subtotal_amount
                                ELSE oi.line_total END) AS revenue,
                       MAX(c.unit_cost) AS unit_cost
                FROM delivered d
                JOIN order_items oi ON oi.order_id = d.id
                JOIN product_variants pv ON pv.id = oi.variant_id
                JOIN products p ON p.id = pv.product_id
                LEFT JOIN avg_cost c ON c.variant_id = oi.variant_id
                GROUP BY pv.id, pv.sku, p.name, p.product_type
                ORDER BY revenue DESC
                LIMIT 10
                """, params, (rs, i) -> {
            BigDecimal revenue = rs.getBigDecimal("revenue").setScale(0, RoundingMode.HALF_UP);
            BigDecimal unitCost = rs.getBigDecimal("unit_cost");
            long units = rs.getLong("units");
            BigDecimal cogs = unitCost == null ? null : unitCost.multiply(BigDecimal.valueOf(units)).setScale(0, RoundingMode.HALF_UP);
            BigDecimal profit = cogs == null ? null : revenue.subtract(cogs);
            return new RevenueReport.Product(rs.getObject("variant_id", UUID.class), rs.getString("sku"),
                    rs.getString("name"), rs.getString("product_type"), units, revenue, cogs, profit,
                    profit == null ? null : margin(profit, revenue));
        });
    }

    /**
     * Opening, in (receipts, buyer returns), out (orders packed), adjustments and closing stock per variant for the
     * period, with the stock's value at average cost and a low-stock warning on what can still be sold today.
     */
    @Transactional(readOnly = true)
    public InventoryReport inventory(LocalDate from, LocalDate to, UUID warehouseId, int lowStockThreshold) {
        MapSqlParameterSource params = period(from, to)
                .addValue("warehouseId", warehouseId)
                .addValue("threshold", lowStockThreshold);
        List<InventoryReport.Line> lines = jdbc.query("WITH " + AVG_COST + """
                , stock AS (
                    SELECT s.variant_id, SUM(s.quantity) AS on_hand, SUM(s.quantity - s.reserved_qty) AS free
                    FROM inventory_stocks s
                    WHERE CAST(:warehouseId AS uuid) IS NULL OR s.warehouse_id = CAST(:warehouseId AS uuid)
                    GROUP BY s.variant_id
                ), moved AS (
                    SELECT s.variant_id,
                           COALESCE(SUM(m.quantity) FILTER (WHERE m.occurred_at >= :start AND m.occurred_at < :end AND m.type = 'import'), 0) AS imported,
                           COALESCE(SUM(m.quantity) FILTER (WHERE m.occurred_at >= :start AND m.occurred_at < :end AND m.type = 'return'), 0) AS returned,
                           COALESCE(SUM(m.quantity) FILTER (WHERE m.occurred_at >= :start AND m.occurred_at < :end AND m.type = 'export'), 0) AS exported,
                           COALESCE(SUM(m.quantity) FILTER (WHERE m.occurred_at >= :start AND m.occurred_at < :end AND m.type NOT IN ('import', 'return', 'export')), 0) AS adjusted,
                           COALESCE(SUM(m.quantity) FILTER (WHERE m.occurred_at >= :end), 0) AS after_period
                    FROM inventory_movements m
                    JOIN inventory_stocks s ON s.id = m.stock_id
                    WHERE CAST(:warehouseId AS uuid) IS NULL OR s.warehouse_id = CAST(:warehouseId AS uuid)
                    GROUP BY s.variant_id
                ), held AS (
                    SELECT oi.variant_id, SUM(oi.quantity) AS quantity
                    FROM order_items oi JOIN orders o ON o.id = oi.order_id
                    WHERE o.status IN ('pending', 'confirmed', 'cancel_requested') AND o.shipment_status = 'pending'
                    GROUP BY oi.variant_id
                )
                SELECT pv.id AS variant_id, pv.sku, p.name, pv.status,
                       COALESCE(mv.imported, 0) AS imported, COALESCE(mv.returned, 0) AS returned,
                       -COALESCE(mv.exported, 0) AS exported, COALESCE(mv.adjusted, 0) AS adjusted,
                       st.on_hand - COALESCE(mv.after_period, 0) AS closing,
                       GREATEST(st.free - COALESCE(h.quantity, 0), 0) AS available_now,
                       c.unit_cost
                FROM stock st
                JOIN product_variants pv ON pv.id = st.variant_id
                JOIN products p ON p.id = pv.product_id
                LEFT JOIN moved mv ON mv.variant_id = st.variant_id
                LEFT JOIN held h ON h.variant_id = st.variant_id
                LEFT JOIN avg_cost c ON c.variant_id = st.variant_id
                ORDER BY (pv.status = 'active' AND GREATEST(st.free - COALESCE(h.quantity, 0), 0) <= :threshold) DESC, p.name, pv.sku
                """, params, (rs, i) -> {
            long imported = rs.getLong("imported");
            long returned = rs.getLong("returned");
            long exported = rs.getLong("exported");
            long adjusted = rs.getLong("adjusted");
            long closing = rs.getLong("closing");
            long opening = closing - imported - returned + exported - adjusted;
            long available = rs.getLong("available_now");
            BigDecimal unitCost = rs.getBigDecimal("unit_cost");
            return new InventoryReport.Line(rs.getObject("variant_id", UUID.class), rs.getString("sku"),
                    rs.getString("name"), opening, imported, returned, exported, adjusted, closing, available,
                    unitCost == null ? null : unitCost.setScale(0, RoundingMode.HALF_UP),
                    unitCost == null ? null : unitCost.multiply(BigDecimal.valueOf(closing)).setScale(0, RoundingMode.HALF_UP),
                    "active".equals(rs.getString("status")) && available <= lowStockThreshold);
        });
        long lowStock = lines.stream().filter(InventoryReport.Line::lowStock).count();
        BigDecimal value = lines.stream().map(InventoryReport.Line::closingValue).filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long uncosted = lines.stream().filter(l -> l.unitCost() == null && l.closing() > 0).count();
        return new InventoryReport(from, to, warehouseId, lowStockThreshold, lines.size(), lowStock, value, uncosted, lines);
    }

    /** [from 00:00, to + 1 day 00:00) in Vietnam time. */
    static MapSqlParameterSource period(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("Khoảng thời gian báo cáo không hợp lệ");
        }
        if (from.plusDays(MAX_DAYS).isBefore(to)) {
            throw new IllegalArgumentException("Báo cáo tối đa " + MAX_DAYS + " ngày");
        }
        java.time.ZoneId zone = java.time.ZoneId.of(TZ);
        return new MapSqlParameterSource()
                .addValue("start", from.atStartOfDay(zone).toOffsetDateTime())
                .addValue("end", to.plusDays(1).atStartOfDay(zone).toOffsetDateTime());
    }

    private static BigDecimal margin(BigDecimal profit, BigDecimal revenue) {
        if (profit == null || revenue == null || revenue.signum() <= 0) return null;
        return profit.multiply(BigDecimal.valueOf(100)).divide(revenue, 1, RoundingMode.HALF_UP);
    }

    private static final class DayAcc {
        long orders;
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal refunds = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        long uncostedUnits;

        RevenueReport.Day toDay(LocalDate day) {
            BigDecimal net = revenue.subtract(refunds);
            BigDecimal cost = cogs.setScale(0, RoundingMode.HALF_UP);
            return new RevenueReport.Day(day, orders, revenue.setScale(0, RoundingMode.HALF_UP),
                    refunds.setScale(0, RoundingMode.HALF_UP), net.setScale(0, RoundingMode.HALF_UP), cost,
                    net.subtract(cost).setScale(0, RoundingMode.HALF_UP), uncostedUnits);
        }
    }
}
