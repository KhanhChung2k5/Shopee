package com.chotomua.backend.modules.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Revenue and gross profit for a period. netRevenue = revenue − refunds; grossProfit = netRevenue − cogs.
 * uncostedUnits: units sold whose variant has no approved receipt cost, so their cost is missing from cogs.
 */
public record RevenueReport(
        LocalDate from,
        LocalDate to,
        long orders,
        BigDecimal revenue,
        BigDecimal refunds,
        BigDecimal netRevenue,
        BigDecimal cogs,
        BigDecimal grossProfit,
        BigDecimal marginPct,
        long uncostedUnits,
        List<Day> days,
        List<Product> topProducts
) {
    public record Day(LocalDate day, long orders, BigDecimal revenue, BigDecimal refunds, BigDecimal netRevenue,
                      BigDecimal cogs, BigDecimal grossProfit, long uncostedUnits) {
    }

    /** cogs / grossProfit / marginPct are null when the variant has no cost yet. */
    public record Product(UUID variantId, String sku, String name, String productType, long units, BigDecimal revenue,
                          BigDecimal cogs, BigDecimal grossProfit, BigDecimal marginPct) {
    }
}
