package com.chotomua.backend.modules.report;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Revenue / profit (sales, admin) and stock in-out-on-hand (warehouse, admin) — see SecurityConfig. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/revenue")
    public RevenueReport revenue(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.revenue(from, to);
    }

    @GetMapping("/inventory")
    public InventoryReport inventory(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                     @RequestParam(required = false) UUID warehouseId,
                                     @RequestParam(defaultValue = "5") int lowStockThreshold) {
        return reports.inventory(from, to, warehouseId, Math.max(0, lowStockThreshold));
    }
}
