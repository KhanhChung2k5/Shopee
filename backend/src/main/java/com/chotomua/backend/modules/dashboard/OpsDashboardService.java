package com.chotomua.backend.modules.dashboard;

import com.chotomua.backend.modules.crm.application.campaign.CampaignProductTargetStore;
import com.chotomua.backend.modules.crm.application.campaign.CampaignStore;
import com.chotomua.backend.modules.crm.application.report.CampaignConversionWindow;
import com.chotomua.backend.modules.crm.domain.campaign.Campaign;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ba dashboard vận hành. Đơn tiền tệ làm tròn đồng. Ngày theo giờ Việt Nam. */
@Service
public class OpsDashboardService {

    static final String TZ = "Asia/Ho_Chi_Minh";
    static final int MAX_DAYS = 366;
    private static final ZoneId ZONE = ZoneId.of(TZ);
    private static final Set<String> PRODUCT_TYPES = Set.of("game_disc", "controller", "accessory");
    private static final List<String> TYPE_ORDER = List.of("game_disc", "controller", "accessory");
    private static final List<String> RFM_ORDER = List.of(
            "champions", "loyal", "potential", "at_risk", "lost", "other", "new", "unknown");
    private static final String INTERVAL_GAPS = """
            WITH gaps AS (
                SELECT user_id,
                       EXTRACT(EPOCH FROM (created_at - prev)) / 86400 AS days
                FROM (
                    SELECT user_id, created_at,
                           LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at, id) AS prev
                    FROM orders
                    WHERE status = 'delivered'%s
                ) sequenced
                WHERE prev IS NOT NULL AND created_at >= :start AND created_at < :end
            )
            """;

    private static final String OPEN_ORDER = "o.created_at >= :start AND o.created_at < :end AND o.status <> 'cancelled'";
    private static final String RFM_MATCH = """
            EXISTS (
                SELECT 1 FROM users uf
                WHERE uf.id = o.user_id
                  AND COALESCE(NULLIF(uf.rfm_segment, ''), 'unknown') IN (:segments)
            )""";
    private static final String TYPE_MATCH = """
            EXISTS (
                SELECT 1 FROM order_items oif
                JOIN product_variants vf ON vf.id = oif.variant_id
                JOIN products pf ON pf.id = vf.product_id
                WHERE oif.order_id = o.id AND pf.product_type IN (:productTypes)
            )""";

    private final NamedParameterJdbcTemplate jdbc;
    private final CampaignStore campaigns;
    private final CampaignProductTargetStore productTargets;
    private final ProductPort products;

    public OpsDashboardService(
            NamedParameterJdbcTemplate jdbc,
            CampaignStore campaigns,
            CampaignProductTargetStore productTargets,
            ProductPort products
    ) {
        this.jdbc = jdbc;
        this.campaigns = campaigns;
        this.productTargets = productTargets;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public SalesOpsReport sales(LocalDate from, LocalDate to) {
        return sales(from, to, List.of(), List.of());
    }

    @Transactional(readOnly = true)
    public SalesOpsReport sales(LocalDate from, LocalDate to, List<String> segments, List<String> types) {
        MapSqlParameterSource params = filteredPeriod(from, to, segments, types);
        Map<String, SalesOpsReport.Month> months = emptyMonths(from, to);
        jdbc.query("""
                SELECT to_char((o.created_at AT TIME ZONE '%s'), 'YYYY-MM') AS month,
                       COALESCE(SUM(o.subtotal_amount), 0) AS gmv,
                       COALESCE(SUM(o.subtotal_amount - o.discount_amount), 0) AS net_product,
                       COALESCE(SUM(o.total_amount), 0) AS collected,
                       COUNT(*) AS orders
                FROM orders o
                WHERE %s
                GROUP BY 1
                """.formatted(TZ, where(params)), params, rs -> {
            String month = rs.getString("month");
            SalesOpsReport.Month row = months.get(month);
            if (row == null) return;
            long orders = rs.getLong("orders");
            BigDecimal collected = money(rs.getBigDecimal("collected"));
            months.put(month, new SalesOpsReport.Month(
                    month,
                    money(rs.getBigDecimal("gmv")),
                    money(rs.getBigDecimal("net_product")),
                    collected,
                    orders,
                    orders == 0 ? money(BigDecimal.ZERO) : money(collected.divide(BigDecimal.valueOf(orders), 0, RoundingMode.HALF_UP))));
        });

        BigDecimal gmv = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;
        BigDecimal collected = BigDecimal.ZERO;
        long orders = 0;
        for (SalesOpsReport.Month month : months.values()) {
            gmv = gmv.add(month.gmv());
            net = net.add(month.netProduct());
            collected = collected.add(month.collected());
            orders += month.orders();
        }

        long[] refundOrders = refundedOrderCounts(params);
        BigDecimal[] refundMoney = refundedMoney(params);
        BigDecimal priorNet = sumNetProduct(from.minusYears(1), to.minusYears(1), params);

        return new SalesOpsReport(
                from,
                to,
                gmv,
                net,
                collected,
                refundMoney[0],
                refundMoney[1].longValue(),
                orders,
                orders == 0 ? money(BigDecimal.ZERO) : money(collected.divide(BigDecimal.valueOf(orders), 0, RoundingMode.HALF_UP)),
                refundOrders[0],
                refundOrders[1],
                pct(refundOrders[1], refundOrders[0]),
                priorNet,
                yoyPct(net, priorNet),
                List.copyOf(months.values()),
                productTypes(params),
                payments(params),
                refundReasons(params),
                stages(params));
    }

    @Transactional(readOnly = true)
    public MarketingOpsReport marketing(LocalDate from, LocalDate to) {
        return marketing(from, to, List.of(), List.of());
    }

    @Transactional(readOnly = true)
    public MarketingOpsReport marketing(LocalDate from, LocalDate to, List<String> segments, List<String> types) {
        MapSqlParameterSource params = filteredPeriod(from, to, segments, types);
        PromoFlags flags = promoFlags(params);
        return new MarketingOpsReport(
                from,
                to,
                flags.withPromo(),
                flags.withoutPromo(),
                flags.discount(),
                flags.withPromo().orders() == 0 ? null
                        : money(flags.discount().divide(BigDecimal.valueOf(flags.withPromo().orders()), 0, RoundingMode.HALF_UP)),
                flags.mechanisms(),
                flashSales(params),
                tiers(params),
                vouchers(params),
                campaignRows(from, to, params));
    }

    @Transactional(readOnly = true)
    public BehaviorReport behavior(LocalDate from, LocalDate to) {
        return behavior(from, to, List.of(), List.of());
    }

    @Transactional(readOnly = true)
    public BehaviorReport behavior(LocalDate from, LocalDate to, List<String> segments, List<String> types) {
        MapSqlParameterSource params = filteredPeriod(from, to, segments, types);
        long[] basket = jdbc.queryForObject("""
                WITH scoped AS (
                    SELECT o.id FROM orders o WHERE %s
                ),
                flags AS (
                    SELECT s.id,
                           COUNT(DISTINCT p.category_id) FILTER (WHERE p.category_id IS NOT NULL) AS cats,
                           COUNT(DISTINCT p.product_type) AS types
                    FROM scoped s
                    LEFT JOIN order_items oi ON oi.order_id = s.id
                    LEFT JOIN product_variants v ON v.id = oi.variant_id
                    LEFT JOIN products p ON p.id = v.product_id
                    GROUP BY s.id
                )
                SELECT COUNT(*) AS orders,
                       COUNT(*) FILTER (WHERE cats >= 2) AS cross_cat,
                       COUNT(*) FILTER (WHERE types >= 2) AS cross_type
                FROM flags
                """.formatted(where(params)), params, (rs, n) -> new long[] {
                rs.getLong("orders"), rs.getLong("cross_cat"), rs.getLong("cross_type")
        });
        if (basket == null) basket = new long[3];

        IntervalStats intervals = intervals(params);
        return new BehaviorReport(
                from,
                to,
                basket[0],
                basket[1],
                pct(basket[1], basket[0]),
                basket[2],
                pct(basket[2], basket[0]),
                intervals.repeats,
                intervals.avgDays,
                intervals.medianDays,
                intervals.buckets);
    }

    @Transactional(readOnly = true)
    public BehaviorTree tree(
            LocalDate from,
            LocalDate to,
            UUID categoryId,
            boolean uncategorized,
            String productType,
            UUID productId,
            UUID variantId
    ) {
        return tree(from, to, categoryId, uncategorized, productType, productId, variantId, List.of(), List.of());
    }

    @Transactional(readOnly = true)
    public BehaviorTree tree(
            LocalDate from,
            LocalDate to,
            UUID categoryId,
            boolean uncategorized,
            String productType,
            UUID productId,
            UUID variantId,
            List<String> segments,
            List<String> types
    ) {
        if (uncategorized && categoryId != null) {
            throw new IllegalArgumentException("Chỉ chọn một nhóm hàng");
        }
        if (productType != null && !PRODUCT_TYPES.contains(productType)) {
            throw new IllegalArgumentException("Loại sản phẩm không hợp lệ");
        }
        if (variantId != null && productId == null) {
            throw new IllegalArgumentException("Chọn sản phẩm trước khi chọn biến thể");
        }
        MapSqlParameterSource params = filteredPeriod(from, to, segments, types);
        if (categoryId != null) params.addValue("categoryId", categoryId);
        if (productType != null) params.addValue("productType", productType);
        if (productId != null) params.addValue("productId", productId);
        if (variantId != null) params.addValue("variantId", variantId);

        String scope = scopeExists(categoryId != null, uncategorized, productType != null, productId != null, variantId != null);
        String scoped = where(params) + (scope.isEmpty() ? "" : " AND " + scope);
        long parentOrders = countOrders(scoped, params);
        String label = nodeLabel(categoryId, uncategorized, productType, productId, variantId, params);

        if (variantId != null) {
            return new BehaviorTree("variant", label, parentOrders, "Biến thể hay được mua kèm",
                    List.of(), companions(variantCompanionSql(where(params)), params, parentOrders));
        }
        if (productId != null) {
            return new BehaviorTree("product", label, parentOrders, "Sản phẩm hay được mua kèm",
                    children(variantChildSql(where(params)), params, parentOrders),
                    companions(productCompanionSql(where(params)), params, parentOrders));
        }
        if (productType != null) {
            return new BehaviorTree("type", label, parentOrders, "Loại sản phẩm khác hay có trong cùng đơn",
                    children(productChildSql(where(params), categoryId != null, uncategorized), params, parentOrders),
                    namedTypes(companions(typeCompanionSql(where(params), categoryId != null, uncategorized), params, parentOrders)));
        }
        if (categoryId != null || uncategorized) {
            return new BehaviorTree("category", label, parentOrders, "Nhóm khác hay có trong cùng đơn",
                    namedTypes(children(typeChildSql(where(params), categoryId != null, uncategorized), params, parentOrders)),
                    companions(categoryCompanionSql(where(params), categoryId != null), params, parentOrders));
        }
        return new BehaviorTree("root", "Mọi đơn trong kỳ", parentOrders, null,
                children(categoryChildSql(where(params)), params, parentOrders), List.of());
    }

    private List<SalesOpsReport.ProductType> productTypes(MapSqlParameterSource params) {
        Map<String, SalesOpsReport.ProductType> byType = new LinkedHashMap<>();
        List<String> visibleTypes = params.hasValue("productTypes")
                ? paramList(params, "productTypes").stream().filter(TYPE_ORDER::contains).toList()
                : TYPE_ORDER;
        for (String type : visibleTypes) byType.put(type, new SalesOpsReport.ProductType(type, money(BigDecimal.ZERO), 0, money(BigDecimal.ZERO)));
        jdbc.query("""
                SELECT p.product_type,
                       COALESCE(SUM(oi.line_total), 0) AS merchandise,
                       COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s
                GROUP BY p.product_type
                """.formatted(where(params)), params, rs -> {
            String type = rs.getString("product_type");
            long count = rs.getLong("orders");
            BigDecimal merchandise = money(rs.getBigDecimal("merchandise"));
            byType.put(type, new SalesOpsReport.ProductType(
                    type,
                    merchandise,
                    count,
                    count == 0 ? money(BigDecimal.ZERO) : money(merchandise.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP))));
        });
        return List.copyOf(byType.values());
    }

    private List<SalesOpsReport.PaymentSlice> payments(MapSqlParameterSource params) {
        return jdbc.query("""
                SELECT COALESCE(pay.method, 'unknown') AS method, pay.status,
                       COUNT(*) AS cnt, COALESCE(SUM(pay.amount), 0) AS amount
                FROM payments pay
                JOIN orders o ON o.id = pay.order_id
                WHERE pay.purpose = 'checkout' AND o.created_at >= :start AND o.created_at < :end%s
                GROUP BY 1, 2
                ORDER BY 1, 2
                """.formatted(matchClause(params)), params, (rs, n) -> new SalesOpsReport.PaymentSlice(
                rs.getString("method"), rs.getString("status"), rs.getLong("cnt"), money(rs.getBigDecimal("amount"))));
    }

    private long[] refundedOrderCounts(MapSqlParameterSource params) {
        long[] row = jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE o.status = 'delivered') AS delivered,
                       COUNT(*) FILTER (WHERE o.status = 'delivered' AND EXISTS (
                           SELECT 1 FROM refund_returns r WHERE r.order_id = o.id AND r.status = 'refunded'
                       )) AS refunded_orders
                FROM orders o
                WHERE o.created_at >= :start AND o.created_at < :end%s
                """.formatted(matchClause(params)), params, (rs, n) -> new long[] { rs.getLong("delivered"), rs.getLong("refunded_orders") });
        return row == null ? new long[2] : row;
    }

    private BigDecimal[] refundedMoney(MapSqlParameterSource params) {
        BigDecimal[] row = jdbc.queryForObject("""
                SELECT COALESCE(SUM(r.refund_amount), 0) AS amount, COUNT(*) AS cnt
                FROM refund_returns r
                JOIN orders o ON o.id = r.order_id
                WHERE r.status = 'refunded' AND r.refunded_at >= :start AND r.refunded_at < :end%s
                """.formatted(matchClause(params)), params, (rs, n) -> new BigDecimal[] { money(rs.getBigDecimal("amount")), BigDecimal.valueOf(rs.getLong("cnt")) });
        return row == null ? new BigDecimal[] { money(BigDecimal.ZERO), BigDecimal.ZERO } : row;
    }

    private List<SalesOpsReport.RefundReason> refundReasons(MapSqlParameterSource params) {
        return jdbc.query("""
                SELECT r.kind,
                       COALESCE(NULLIF(BTRIM(r.reason), ''), 'Không ghi lý do') AS reason,
                       COUNT(*) AS cnt,
                       COALESCE(SUM(r.refund_amount), 0) AS amount
                FROM refund_returns r
                JOIN orders o ON o.id = r.order_id
                WHERE r.status = 'refunded' AND r.refunded_at >= :start AND r.refunded_at < :end%s
                GROUP BY 1, 2
                ORDER BY amount DESC, cnt DESC
                LIMIT 20
                """.formatted(matchClause(params)), params, (rs, n) -> new SalesOpsReport.RefundReason(
                rs.getString("kind"), rs.getString("reason"), rs.getLong("cnt"), money(rs.getBigDecimal("amount"))));
    }

    private List<SalesOpsReport.Stage> stages(MapSqlParameterSource params) {
        return jdbc.query("""
                WITH marks AS (
                    SELECT order_id, status, MIN(changed_at) AS at
                    FROM order_status_histories
                    WHERE status IN ('pending', 'confirmed', 'shipping', 'delivered')
                    GROUP BY order_id, status
                ),
                wide AS (
                    SELECT o.id,
                           MAX(m.at) FILTER (WHERE m.status = 'pending') AS pending_at,
                           MAX(m.at) FILTER (WHERE m.status = 'confirmed') AS confirmed_at,
                           MAX(m.at) FILTER (WHERE m.status = 'shipping') AS shipping_at,
                           MAX(m.at) FILTER (WHERE m.status = 'delivered') AS delivered_at
                    FROM orders o
                    JOIN marks m ON m.order_id = o.id
                    WHERE o.status = 'delivered' AND o.created_at >= :start AND o.created_at < :end%s
                    GROUP BY o.id
                )
                SELECT AVG(EXTRACT(EPOCH FROM (confirmed_at - pending_at)) / 3600) FILTER (WHERE confirmed_at > pending_at) AS confirm_hours,
                       COUNT(*) FILTER (WHERE confirmed_at > pending_at) AS confirm_orders,
                       AVG(EXTRACT(EPOCH FROM (shipping_at - confirmed_at)) / 3600) FILTER (WHERE shipping_at > confirmed_at) AS ship_hours,
                       COUNT(*) FILTER (WHERE shipping_at > confirmed_at) AS ship_orders,
                       AVG(EXTRACT(EPOCH FROM (delivered_at - shipping_at)) / 3600) FILTER (WHERE delivered_at > shipping_at) AS deliver_hours,
                       COUNT(*) FILTER (WHERE delivered_at > shipping_at) AS deliver_orders
                FROM wide
                """.formatted(matchClause(params)), params, (rs, n) -> List.of(
                stage("pending", "confirmed", rs, "confirm_hours", "confirm_orders"),
                stage("confirmed", "shipping", rs, "ship_hours", "ship_orders"),
                stage("shipping", "delivered", rs, "deliver_hours", "deliver_orders"))).stream().findFirst().orElse(List.of());
    }

    private static SalesOpsReport.Stage stage(String from, String to, ResultSet rs, String hours, String orders) throws SQLException {
        double raw = rs.getDouble(hours);
        BigDecimal avg = rs.wasNull() ? null : BigDecimal.valueOf(raw).setScale(1, RoundingMode.HALF_UP);
        return new SalesOpsReport.Stage(from, to, avg, rs.getLong(orders));
    }

    private PromoFlags promoFlags(MapSqlParameterSource params) {
        record Acc(long orders, BigDecimal revenue, BigDecimal discount) {}
        Map<String, Acc> byKey = new HashMap<>();
        jdbc.query("""
                WITH flags AS (
                    SELECT o.id, o.total_amount,
                           EXISTS (
                               SELECT 1 FROM promotion_product_applications a
                               JOIN order_items oi ON oi.id = a.order_item_id
                               WHERE oi.order_id = o.id
                           ) AS product_promo,
                           EXISTS (
                               SELECT 1 FROM promotion_invoice_applications a WHERE a.order_id = o.id
                           ) AS invoice_promo
                    FROM orders o
                    WHERE %s
                ),
                discount AS (
                    SELECT oi.order_id, SUM(a.discount_amount) AS amount
                    FROM promotion_product_applications a
                    JOIN order_items oi ON oi.id = a.order_item_id
                    GROUP BY oi.order_id
                    UNION ALL
                    SELECT a.order_id, SUM(a.discount_amount)
                    FROM promotion_invoice_applications a
                    GROUP BY a.order_id
                ),
                discount_by_order AS (
                    SELECT order_id, SUM(amount) AS amount FROM discount GROUP BY order_id
                )
                SELECT CASE
                           WHEN f.product_promo AND f.invoice_promo THEN 'both'
                           WHEN f.product_promo THEN 'product'
                           WHEN f.invoice_promo THEN 'invoice'
                           ELSE 'none'
                       END AS key,
                       COUNT(*) AS orders,
                       COALESCE(SUM(f.total_amount), 0) AS revenue,
                       COALESCE(SUM(d.amount), 0) AS discount
                FROM flags f
                LEFT JOIN discount_by_order d ON d.order_id = f.id
                GROUP BY 1
                """.formatted(where(params)), params, rs -> {
            byKey.put(rs.getString("key"), new Acc(rs.getLong("orders"), money(rs.getBigDecimal("revenue")), money(rs.getBigDecimal("discount"))));
        });
        Acc product = byKey.getOrDefault("product", new Acc(0, money(BigDecimal.ZERO), money(BigDecimal.ZERO)));
        Acc invoice = byKey.getOrDefault("invoice", new Acc(0, money(BigDecimal.ZERO), money(BigDecimal.ZERO)));
        Acc both = byKey.getOrDefault("both", new Acc(0, money(BigDecimal.ZERO), money(BigDecimal.ZERO)));
        Acc none = byKey.getOrDefault("none", new Acc(0, money(BigDecimal.ZERO), money(BigDecimal.ZERO)));
        long withOrders = product.orders + invoice.orders + both.orders;
        BigDecimal withRevenue = product.revenue.add(invoice.revenue).add(both.revenue);
        BigDecimal discount = product.discount.add(invoice.discount).add(both.discount);
        List<MarketingOpsReport.Mechanism> mechanisms = List.of(
                new MarketingOpsReport.Mechanism("product", "Chỉ giảm theo sản phẩm", product.orders, product.revenue, product.discount),
                new MarketingOpsReport.Mechanism("invoice", "Chỉ giảm theo hoá đơn", invoice.orders, invoice.revenue, invoice.discount),
                new MarketingOpsReport.Mechanism("both", "Cả giảm sản phẩm và hoá đơn", both.orders, both.revenue, both.discount));
        return new PromoFlags(
                new MarketingOpsReport.PromoSide(withOrders, withRevenue),
                new MarketingOpsReport.PromoSide(none.orders, none.revenue),
                discount,
                mechanisms);
    }

    private List<MarketingOpsReport.FlashSale> flashSales(MapSqlParameterSource params) {
        String typeSql = params.hasValue("productTypes") ? " AND p.product_type IN (:productTypes)" : "";
        return jdbc.query("""
                SELECT pp.name AS program_name, p.name AS product_name, v.sku,
                       d.sold_qty, d.limit_qty, d.flash_price
                FROM promotion_product_details d
                JOIN promotion_programs pp ON pp.id = d.promotion_program_id
                JOIN product_variants v ON v.id = d.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE d.flash_price IS NOT NULL
                  AND pp.start_at < :end AND pp.end_at >= :start%s
                ORDER BY CASE WHEN d.limit_qty IS NULL OR d.limit_qty = 0 THEN 0
                              ELSE d.sold_qty::numeric / d.limit_qty END DESC, d.sold_qty DESC
                """.formatted(typeSql), params, (rs, n) -> {
            int sold = rs.getInt("sold_qty");
            Integer limit = rs.getObject("limit_qty") == null ? null : rs.getInt("limit_qty");
            BigDecimal soldPct = limit == null || limit == 0 ? null
                    : BigDecimal.valueOf(sold).multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(limit), 1, RoundingMode.HALF_UP);
            return new MarketingOpsReport.FlashSale(
                    rs.getString("program_name"), rs.getString("product_name"), rs.getString("sku"),
                    sold, limit, soldPct, money(rs.getBigDecimal("flash_price")));
        });
    }

    /** Đơn có khuyến mãi, nhóm theo phân khúc RFM hiện tại của khách. */
    private List<MarketingOpsReport.TierEffect> tiers(MapSqlParameterSource params) {
        Map<String, MarketingOpsReport.TierEffect> bySegment = new LinkedHashMap<>();
        for (String segment : RFM_ORDER) {
            bySegment.put(segment, new MarketingOpsReport.TierEffect(segment, 0, money(BigDecimal.ZERO), money(BigDecimal.ZERO)));
        }
        jdbc.query("""
                WITH applied AS (
                    SELECT oi.order_id, a.discount_amount
                    FROM promotion_product_applications a
                    JOIN order_items oi ON oi.id = a.order_item_id
                    UNION ALL
                    SELECT a.order_id, a.discount_amount
                    FROM promotion_invoice_applications a
                )
                SELECT segment, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue, COALESCE(SUM(discount), 0) AS discount
                FROM (
                    SELECT COALESCE(NULLIF(u.rfm_segment, ''), 'unknown') AS segment,
                           o.id, o.total_amount, SUM(ap.discount_amount) AS discount
                    FROM applied ap
                    JOIN orders o ON o.id = ap.order_id
                    LEFT JOIN users u ON u.id = o.user_id
                    WHERE %s
                    GROUP BY 1, o.id, o.total_amount
                ) per_order
                GROUP BY segment
                """.formatted(where(params)), params, rs -> {
            String segment = rs.getString("segment");
            bySegment.put(segment, new MarketingOpsReport.TierEffect(
                    segment, rs.getLong("orders"), money(rs.getBigDecimal("revenue")), money(rs.getBigDecimal("discount"))));
        });
        if (!params.hasValue("segments")) return List.copyOf(bySegment.values());
        List<String> selected = paramList(params, "segments");
        return RFM_ORDER.stream().filter(selected::contains).map(bySegment::get).filter(java.util.Objects::nonNull).toList();
    }

    private List<MarketingOpsReport.VoucherUse> vouchers(MapSqlParameterSource params) {
        return jdbc.query("""
                SELECT v.code, COUNT(*) AS uses, COUNT(DISTINCT vu.order_id) AS orders
                FROM voucher_usages vu
                JOIN vouchers v ON v.id = vu.voucher_id
                JOIN orders o ON o.id = vu.order_id
                WHERE %s
                GROUP BY v.code
                ORDER BY uses DESC, v.code
                LIMIT 10
                """.formatted(where(params)), params, (rs, n) -> new MarketingOpsReport.VoucherUse(
                rs.getString("code"), rs.getLong("uses"), rs.getLong("orders")));
    }

    private List<MarketingOpsReport.CampaignRow> campaignRows(LocalDate from, LocalDate to, MapSqlParameterSource filters) {
        MapSqlParameterSource params = period(from, to);
        copyFilters(filters, params);
        Instant periodStart = from.atStartOfDay(ZONE).toInstant();
        Instant periodEnd = to.plusDays(1).atStartOfDay(ZONE).toInstant();
        String memberRfm = params.hasValue("segments")
                ? " AND EXISTS (SELECT 1 FROM users uf WHERE uf.id = sm.user_id AND COALESCE(NULLIF(uf.rfm_segment, ''), 'unknown') IN (:segments))"
                : "";
        String notifRfm = params.hasValue("segments")
                ? " AND EXISTS (SELECT 1 FROM users uf WHERE uf.id = n.user_id AND COALESCE(NULLIF(uf.rfm_segment, ''), 'unknown') IN (:segments))"
                : "";

        Map<UUID, long[]> audience = new HashMap<>();
        jdbc.query("""
                SELECT c.id,
                       (SELECT COUNT(DISTINCT sm.user_id)
                        FROM campaign_targets ct
                        JOIN segment_members sm ON sm.segment_id = ct.segment_id
                        WHERE ct.campaign_id = c.id%s) AS targeted,
                       (SELECT COUNT(DISTINCT n.user_id) FROM notifications n
                        WHERE n.campaign_id = c.id AND n.status IN ('sent', 'read')%s) AS sent,
                       (SELECT COUNT(DISTINCT n.user_id) FROM notifications n
                        WHERE n.campaign_id = c.id AND n.status = 'read'%s) AS opened
                FROM campaigns c
                """.formatted(memberRfm, notifRfm, notifRfm), params, audienceRow -> {
            audience.put(audienceRow.getObject("id", UUID.class), new long[] {
                    audienceRow.getLong("targeted"), audienceRow.getLong("sent"), audienceRow.getLong("opened")
            });
        });

        Map<UUID, List<OrderHit>> hits = new HashMap<>();
        jdbc.query("""
                SELECT n.campaign_id, o.user_id, o.id AS order_id, o.total_amount, o.created_at,
                       string_agg(DISTINCT v.product_id::text, ',') AS product_ids
                FROM notifications n
                JOIN orders o ON o.user_id = n.user_id AND o.status = 'delivered'
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN product_variants v ON v.id = oi.variant_id
                WHERE n.campaign_id IS NOT NULL AND n.status IN ('sent', 'read')%s
                GROUP BY n.campaign_id, o.user_id, o.id, o.total_amount, o.created_at
                """.formatted(matchClause(params)), params, rs -> {
            UUID campaignId = rs.getObject("campaign_id", UUID.class);
            hits.computeIfAbsent(campaignId, ignored -> new ArrayList<>()).add(new OrderHit(
                    rs.getObject("user_id", UUID.class),
                    rs.getObject("order_id", UUID.class),
                    nz(rs.getBigDecimal("total_amount")),
                    timestamp(rs, "created_at"),
                    parseIds(rs.getString("product_ids"))));
        });

        List<MarketingOpsReport.CampaignRow> rows = new ArrayList<>();
        for (Campaign campaign : campaigns.findAll()) {
            Instant windowFrom = CampaignConversionWindow.from(campaign);
            Instant windowTo = CampaignConversionWindow.to(campaign);
            if (windowTo.isBefore(periodStart) || !windowFrom.isBefore(periodEnd)) continue;
            long[] counts = audience.getOrDefault(campaign.id(), new long[3]);
            Set<UUID> targetProducts = resolveProductIds(productTargets.find(campaign.id()).orElse(null));
            Set<UUID> buyers = new LinkedHashSet<>();
            Set<UUID> orderIds = new LinkedHashSet<>();
            BigDecimal revenue = BigDecimal.ZERO;
            for (OrderHit hit : hits.getOrDefault(campaign.id(), List.of())) {
                if (!CampaignConversionWindow.contains(hit.createdAt, windowFrom, windowTo)) continue;
                if (!targetProducts.isEmpty() && hit.productIds.stream().noneMatch(targetProducts::contains)) continue;
                buyers.add(hit.userId);
                if (orderIds.add(hit.orderId)) revenue = revenue.add(hit.total);
            }
            rows.add(new MarketingOpsReport.CampaignRow(
                    campaign.id(),
                    campaign.name(),
                    windowFrom,
                    windowTo,
                    campaign.endAt() == null,
                    counts[0],
                    counts[1],
                    counts[2],
                    buyers.size(),
                    pct(counts[2], counts[1]),
                    pct(buyers.size(), counts[1]),
                    money(revenue)));
        }
        rows.sort(Comparator.comparing(MarketingOpsReport.CampaignRow::revenue).reversed()
                .thenComparing(MarketingOpsReport.CampaignRow::name));
        return rows;
    }

    private Set<UUID> resolveProductIds(CampaignProductTarget target) {
        if (target == null) return Set.of();
        Set<UUID> ids = new LinkedHashSet<>();
        if (target.productIds() != null) ids.addAll(target.productIds());
        ProductFilter filter = target.filter();
        if (filter != null && !filter.isUnconstrained()) {
            for (ProductView product : products.search(filter)) ids.add(product.id());
        }
        return ids;
    }

    private IntervalStats intervals(MapSqlParameterSource params) {
        GapSummary summary = jdbc.queryForObject(intervalGaps(params) + """
                SELECT COUNT(*) AS repeats,
                       AVG(days) AS avg_days,
                       percentile_cont(0.5) WITHIN GROUP (ORDER BY days) AS median_days,
                       COUNT(*) FILTER (WHERE days < 7) AS d7,
                       COUNT(*) FILTER (WHERE days >= 7 AND days < 30) AS d30,
                       COUNT(*) FILTER (WHERE days >= 30 AND days < 90) AS d90,
                       COUNT(*) FILTER (WHERE days >= 90 AND days < 180) AS d180,
                       COUNT(*) FILTER (WHERE days >= 180) AS dmore
                FROM gaps
                """, params, (rs, n) -> {
            long repeats = rs.getLong("repeats");
            return new GapSummary(
                    repeats,
                    repeats == 0 ? null : BigDecimal.valueOf(rs.getDouble("avg_days")).setScale(1, RoundingMode.HALF_UP),
                    repeats == 0 ? null : BigDecimal.valueOf(rs.getDouble("median_days")).setScale(1, RoundingMode.HALF_UP),
                    Map.of(
                            "d7", rs.getLong("d7"),
                            "d30", rs.getLong("d30"),
                            "d90", rs.getLong("d90"),
                            "d180", rs.getLong("d180"),
                            "dmore", rs.getLong("dmore")));
        });
        if (summary == null) summary = new GapSummary(0, null, null, Map.of());
        Map<String, Map<String, Long>> byBucket = intervalSegments(params);
        List<BehaviorReport.IntervalBucket> buckets = List.of(
                intervalBucket("d7", "Dưới 7 ngày", summary.counts(), byBucket),
                intervalBucket("d30", "7–30 ngày", summary.counts(), byBucket),
                intervalBucket("d90", "30–90 ngày", summary.counts(), byBucket),
                intervalBucket("d180", "90–180 ngày", summary.counts(), byBucket),
                intervalBucket("dmore", "Trên 180 ngày", summary.counts(), byBucket));
        return new IntervalStats(summary.repeats(), summary.avgDays(), summary.medianDays(), buckets);
    }

    /** Đếm lần mua lặp trong từng khoảng theo phân khúc RFM hiện tại của khách. */
    private Map<String, Map<String, Long>> intervalSegments(MapSqlParameterSource params) {
        Map<String, Map<String, Long>> byBucket = new LinkedHashMap<>();
        jdbc.query(intervalGaps(params) + """
                SELECT CASE
                           WHEN days < 7 THEN 'd7'
                           WHEN days < 30 THEN 'd30'
                           WHEN days < 90 THEN 'd90'
                           WHEN days < 180 THEN 'd180'
                           ELSE 'dmore'
                       END AS bucket,
                       COALESCE(NULLIF(u.rfm_segment, ''), 'unknown') AS segment,
                       COUNT(*) AS n
                FROM gaps g
                LEFT JOIN users u ON u.id = g.user_id
                GROUP BY 1, 2
                """, params, rs -> {
            byBucket.computeIfAbsent(rs.getString("bucket"), ignored -> new LinkedHashMap<>())
                    .merge(rs.getString("segment"), rs.getLong("n"), Long::sum);
        });
        return byBucket;
    }

    private static BehaviorReport.IntervalBucket intervalBucket(
            String key,
            String label,
            Map<String, Long> counts,
            Map<String, Map<String, Long>> byBucket
    ) {
        long count = counts.getOrDefault(key, 0L);
        return new BehaviorReport.IntervalBucket(key, label, count, segmentShares(byBucket.get(key), count));
    }

    private static List<BehaviorReport.RfmShare> segmentShares(Map<String, Long> counts, long total) {
        if (counts == null || counts.isEmpty() || total <= 0) return List.of();
        List<String> keys = new ArrayList<>(counts.keySet());
        keys.sort(Comparator.comparingInt(key -> {
            int index = RFM_ORDER.indexOf(key);
            return index < 0 ? RFM_ORDER.size() : index;
        }));
        List<BehaviorReport.RfmShare> shares = new ArrayList<>();
        for (String key : keys) {
            long count = counts.getOrDefault(key, 0L);
            if (count <= 0) continue;
            shares.add(new BehaviorReport.RfmShare(key, count, pct(count, total)));
        }
        return shares;
    }

    private long countOrders(String where, MapSqlParameterSource params) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM orders o WHERE " + where, params, Long.class);
        return count == null ? 0 : count;
    }

    private String nodeLabel(UUID categoryId, boolean uncategorized, String productType, UUID productId, UUID variantId, MapSqlParameterSource params) {
        if (variantId != null) {
            String sku = jdbc.query("""
                    SELECT v.sku, p.name FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = :variantId
                    """, params, rs -> rs.next() ? rs.getString("name") + " · " + rs.getString("sku") : null);
            return sku == null ? "Biến thể" : sku;
        }
        if (productId != null) {
            String name = jdbc.query("SELECT name FROM products WHERE id = :productId", params,
                    rs -> rs.next() ? rs.getString("name") : null);
            return name == null ? "Sản phẩm" : name;
        }
        if (productType != null) {
            String type = typeName(productType);
            if (categoryId != null || uncategorized) return nodeLabel(categoryId, uncategorized, null, null, null, params) + " · " + type;
            return type;
        }
        if (uncategorized) return "Chưa phân loại";
        if (categoryId != null) {
            String name = jdbc.query("SELECT name FROM categories WHERE id = :categoryId", params,
                    rs -> rs.next() ? rs.getString("name") : null);
            return name == null ? "Nhóm hàng" : name;
        }
        return "Mọi đơn trong kỳ";
    }

    private List<BehaviorTree.Node> children(String sql, MapSqlParameterSource params, long parentOrders) {
        return jdbc.query(sql, params, (rs, n) -> node(rs, parentOrders));
    }

    private List<BehaviorTree.Node> companions(String sql, MapSqlParameterSource params, long parentOrders) {
        return jdbc.query(sql, params, (rs, n) -> node(rs, parentOrders));
    }

    private static List<BehaviorTree.Node> namedTypes(List<BehaviorTree.Node> nodes) {
        return nodes.stream()
                .map(node -> new BehaviorTree.Node(node.id(), typeName(node.id()), node.orders(), node.sharePct()))
                .toList();
    }

    private static BehaviorTree.Node node(ResultSet rs, long parentOrders) throws SQLException {
        String id = rs.getString("id");
        long orders = rs.getLong("orders");
        return new BehaviorTree.Node(id == null ? "none" : id, rs.getString("label"), orders, pct(orders, parentOrders));
    }

    private static String categoryChildSql(String where) {
        return """
                SELECT p.category_id::text AS id,
                       COALESCE(MAX(c.name), 'Chưa phân loại') AS label,
                       COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE %s
                GROUP BY p.category_id
                ORDER BY orders DESC, label
                """.formatted(where);
    }

    private static String typeChildSql(String where, boolean category, boolean uncategorized) {
        return """
                SELECT p.product_type AS id, p.product_type AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s AND %s
                GROUP BY p.product_type
                ORDER BY orders DESC
                """.formatted(where, itemScope(category, uncategorized, false, false, false));
    }

    private static String productChildSql(String where, boolean category, boolean uncategorized) {
        return """
                SELECT p.id::text AS id, p.name AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s AND %s
                GROUP BY p.id, p.name
                ORDER BY orders DESC, p.name
                LIMIT 50
                """.formatted(where, itemScope(category, uncategorized, true, false, false));
    }

    private static String variantChildSql(String where) {
        return """
                SELECT v.id::text AS id, v.sku AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                WHERE %s AND v.product_id = :productId
                GROUP BY v.id, v.sku
                ORDER BY orders DESC, v.sku
                """.formatted(where);
    }

    private static String categoryCompanionSql(String where, boolean category) {
        String other = category ? "p.category_id IS DISTINCT FROM :categoryId" : "p.category_id IS NOT NULL";
        return """
                SELECT p.category_id::text AS id,
                       COALESCE(MAX(c.name), 'Chưa phân loại') AS label,
                       COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE %s AND %s
                GROUP BY p.category_id
                ORDER BY orders DESC, label
                LIMIT 8
                """.formatted(where + " AND " + scopeExists(category, !category, false, false, false), other);
    }

    private static String typeCompanionSql(String where, boolean category, boolean uncategorized) {
        return """
                SELECT p.product_type AS id, p.product_type AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s AND p.product_type <> :productType
                GROUP BY p.product_type
                ORDER BY orders DESC
                LIMIT 8
                """.formatted(where + " AND " + scopeExists(category, uncategorized, true, false, false));
    }

    private static String productCompanionSql(String where) {
        return """
                SELECT p.id::text AS id, p.name AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s AND p.id <> :productId
                GROUP BY p.id, p.name
                ORDER BY orders DESC, p.name
                LIMIT 8
                """.formatted(where + " AND " + scopeExists(false, false, false, true, false));
    }

    private static String variantCompanionSql(String where) {
        return """
                SELECT v.id::text AS id, p.name || ' · ' || v.sku AS label, COUNT(DISTINCT o.id) AS orders
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE %s AND v.id <> :variantId
                GROUP BY v.id, p.name, v.sku
                ORDER BY orders DESC, label
                LIMIT 8
                """.formatted(where + " AND " + scopeExists(false, false, false, false, true));
    }

    /** Điều kiện trên một dòng hàng. Rỗng khi chưa chọn tầng nào. */
    private static String itemScope(boolean category, boolean uncategorized, boolean type, boolean product, boolean variant) {
        List<String> parts = new ArrayList<>();
        if (category) parts.add("p.category_id = :categoryId");
        if (uncategorized) parts.add("p.category_id IS NULL");
        if (type) parts.add("p.product_type = :productType");
        if (product) parts.add("p.id = :productId");
        if (variant) parts.add("v.id = :variantId");
        return parts.isEmpty() ? "TRUE" : String.join(" AND ", parts);
    }

    /** Đơn có ít nhất một dòng khớp tầng đang đứng. */
    private static String scopeExists(boolean category, boolean uncategorized, boolean type, boolean product, boolean variant) {
        if (!category && !uncategorized && !type && !product && !variant) return "";
        return """
                EXISTS (
                    SELECT 1 FROM order_items oi
                    JOIN product_variants v ON v.id = oi.variant_id
                    JOIN products p ON p.id = v.product_id
                    WHERE oi.order_id = o.id AND %s
                )
                """.formatted(itemScope(category, uncategorized, type, product, variant));
    }

    private static Map<String, SalesOpsReport.Month> emptyMonths(LocalDate from, LocalDate to) {
        Map<String, SalesOpsReport.Month> months = new LinkedHashMap<>();
        YearMonth cursor = YearMonth.from(from);
        YearMonth end = YearMonth.from(to);
        while (!cursor.isAfter(end)) {
            String key = cursor.toString();
            months.put(key, new SalesOpsReport.Month(key, money(BigDecimal.ZERO), money(BigDecimal.ZERO), money(BigDecimal.ZERO), 0, money(BigDecimal.ZERO)));
            cursor = cursor.plusMonths(1);
        }
        return months;
    }

    static MapSqlParameterSource period(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("Khoảng thời gian không hợp lệ");
        }
        if (from.plusDays(MAX_DAYS).isBefore(to)) {
            throw new IllegalArgumentException("Khoảng thời gian tối đa " + MAX_DAYS + " ngày");
        }
        return new MapSqlParameterSource()
                .addValue("start", from.atStartOfDay(ZONE).toOffsetDateTime())
                .addValue("end", to.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime());
    }

    private static BigDecimal money(BigDecimal value) {
        return nz(value).setScale(0, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /** Doanh thu thuần sản phẩm của một kỳ, cùng quy tắc đơn không huỷ. */
    private BigDecimal sumNetProduct(LocalDate from, LocalDate to, MapSqlParameterSource filters) {
        MapSqlParameterSource params = period(from, to);
        copyFilters(filters, params);
        BigDecimal value = jdbc.queryForObject("""
                SELECT COALESCE(SUM(o.subtotal_amount - o.discount_amount), 0)
                FROM orders o
                WHERE %s
                """.formatted(where(params)), params, BigDecimal.class);
        return money(value);
    }

    /** Danh sách rỗng nghĩa là không lọc. `__none__` không khớp bản ghi nào. */
    private static MapSqlParameterSource filteredPeriod(LocalDate from, LocalDate to, List<String> segments, List<String> types) {
        MapSqlParameterSource params = period(from, to);
        List<String> segs = normalize(segments, RFM_ORDER);
        List<String> productTypes = normalize(types, TYPE_ORDER);
        if (segs != null) params.addValue("segments", segs);
        if (productTypes != null) params.addValue("productTypes", productTypes);
        return params;
    }

    private static void copyFilters(MapSqlParameterSource from, MapSqlParameterSource to) {
        if (from.hasValue("segments")) to.addValue("segments", from.getValue("segments"));
        if (from.hasValue("productTypes")) to.addValue("productTypes", from.getValue("productTypes"));
    }

    private static String matchClause(MapSqlParameterSource params) {
        StringBuilder sql = new StringBuilder();
        if (params.hasValue("segments")) sql.append(" AND ").append(RFM_MATCH);
        if (params.hasValue("productTypes")) sql.append(" AND ").append(TYPE_MATCH);
        return sql.toString();
    }

    private static String where(MapSqlParameterSource params) {
        return OPEN_ORDER + matchClause(params);
    }

    private static String intervalGaps(MapSqlParameterSource params) {
        String extra = "";
        if (params.hasValue("segments")) {
            extra += " AND EXISTS (SELECT 1 FROM users uf WHERE uf.id = orders.user_id AND COALESCE(NULLIF(uf.rfm_segment, ''), 'unknown') IN (:segments))";
        }
        if (params.hasValue("productTypes")) {
            extra += " AND EXISTS (SELECT 1 FROM order_items oif JOIN product_variants vf ON vf.id = oif.variant_id JOIN products pf ON pf.id = vf.product_id WHERE oif.order_id = orders.id AND pf.product_type IN (:productTypes))";
        }
        return INTERVAL_GAPS.formatted(extra);
    }

    private static List<String> normalize(List<String> raw, List<String> allowed) {
        if (raw == null || raw.isEmpty()) return null;
        LinkedHashSet<String> values = new LinkedHashSet<>();
        boolean none = false;
        for (String item : raw) {
            if (item == null) continue;
            for (String part : item.split(",")) {
                String value = part.trim();
                if (value.isEmpty()) continue;
                if ("__none__".equals(value)) {
                    none = true;
                    continue;
                }
                if (!allowed.contains(value)) throw new IllegalArgumentException("Bộ lọc không hợp lệ");
                values.add(value);
            }
        }
        if (values.isEmpty()) return none ? List.of("__none__") : null;
        if (values.containsAll(allowed)) return null;
        return List.copyOf(values);
    }

    private static List<String> paramList(MapSqlParameterSource params, String name) {
        Object value = params.getValue(name);
        if (!(value instanceof List<?> list)) return List.of();
        List<String> out = new ArrayList<>();
        for (Object item : list) if (item != null) out.add(item.toString());
        return out;
    }

    /** Phần trăm thay đổi so với cùng kỳ. Null khi kỳ trước không có doanh thu. */
    private static BigDecimal yoyPct(BigDecimal current, BigDecimal prior) {
        if (prior.signum() == 0) return null;
        return current.subtract(prior)
                .multiply(BigDecimal.valueOf(100))
                .divide(prior, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal pct(long part, long whole) {
        if (whole <= 0) return null;
        return BigDecimal.valueOf(part).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(whole), 1, RoundingMode.HALF_UP);
    }

    private static Instant timestamp(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Set<UUID> parseIds(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        Set<UUID> ids = new LinkedHashSet<>();
        for (String part : csv.split(",")) ids.add(UUID.fromString(part));
        return ids;
    }

    private static String typeName(String productType) {
        return switch (productType) {
            case "game_disc" -> "Đĩa game";
            case "controller" -> "Tay cầm";
            case "accessory" -> "Phụ kiện";
            default -> productType;
        };
    }

    private record PromoFlags(
            MarketingOpsReport.PromoSide withPromo,
            MarketingOpsReport.PromoSide withoutPromo,
            BigDecimal discount,
            List<MarketingOpsReport.Mechanism> mechanisms
    ) {}

    private record OrderHit(UUID userId, UUID orderId, BigDecimal total, Instant createdAt, Set<UUID> productIds) {}

    private record GapSummary(long repeats, BigDecimal avgDays, BigDecimal medianDays, Map<String, Long> counts) {}

    private record IntervalStats(long repeats, BigDecimal avgDays, BigDecimal medianDays, List<BehaviorReport.IntervalBucket> buckets) {}
}
