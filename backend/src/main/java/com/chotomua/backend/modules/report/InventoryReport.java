package com.chotomua.backend.modules.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Stock in / out / on hand per variant for a period (nhập – xuất – tồn).
 * closing = opening + imported + returned − exported + adjusted.
 */
public record InventoryReport(
        LocalDate from,
        LocalDate to,
        UUID warehouseId,
        int lowStockThreshold,
        long variants,
        long lowStockVariants,
        BigDecimal closingValue,
        long uncostedVariants,
        List<Line> lines
) {
    /** availableNow: what can still be sold today (on hand minus units held for unpacked orders). */
    public record Line(UUID variantId, String sku, String name, long opening, long imported, long returned,
                       long exported, long adjusted, long closing, long availableNow, BigDecimal unitCost,
                       BigDecimal closingValue, boolean lowStock) {
    }
}
