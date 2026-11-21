package com.chotomua.backend.modules.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Revenue, cashflow (Thu vs Chi), category breakdown and gross profit for a period.
 * netRevenue = revenue − refunds; grossProfit = netRevenue − cogs;
 * totalExpense = importExpense + refunds; netCashFlow = revenue − totalExpense.
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
        BigDecimal importExpense,
        BigDecimal totalExpense,
        BigDecimal netCashFlow,
        List<Day> days,
        List<Product> topProducts,
        List<CategoryRow> byCategory,
        List<CategoryDay> categoryDays
) {
    public record Day(LocalDate day, long orders, BigDecimal revenue, BigDecimal refunds, BigDecimal netRevenue,
                      BigDecimal cogs, BigDecimal grossProfit, long uncostedUnits, BigDecimal importExpense,
                      BigDecimal netCashFlow) {
    }

    /** cogs / grossProfit / marginPct are null when the variant has no cost yet. */
    public record Product(UUID variantId, String sku, String name, String productType, long units, BigDecimal revenue,
                          BigDecimal cogs, BigDecimal grossProfit, BigDecimal marginPct) {
    }

    public record CategoryRow(String categoryId, String categoryName, long orders, long units, BigDecimal revenue,
                              BigDecimal cogs, BigDecimal grossProfit, BigDecimal marginPct) {
    }

    public record CategoryDay(LocalDate day, String categoryId, String categoryName, long orders, long units,
                              BigDecimal revenue) {
    }
}
