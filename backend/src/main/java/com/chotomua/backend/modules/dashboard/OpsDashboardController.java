package com.chotomua.backend.modules.dashboard;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Dashboard vận hành cho CSKH và bán hàng. Quyền ở SecurityConfig. */
@RestController
@RequestMapping("/api/dashboards")
public class OpsDashboardController {

    private final OpsDashboardService dashboards;

    public OpsDashboardController(OpsDashboardService dashboards) {
        this.dashboards = dashboards;
    }

    @GetMapping("/sales")
    public SalesOpsReport sales(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                @RequestParam(required = false) List<String> segments,
                                @RequestParam(required = false) List<String> productTypes) {
        return dashboards.sales(from, to, segments, productTypes);
    }

    @GetMapping("/marketing")
    public MarketingOpsReport marketing(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(required = false) List<String> segments,
                                        @RequestParam(required = false) List<String> productTypes) {
        return dashboards.marketing(from, to, segments, productTypes);
    }

    @GetMapping("/behavior")
    public BehaviorReport behavior(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                   @RequestParam(required = false) List<String> segments,
                                   @RequestParam(required = false) List<String> productTypes) {
        return dashboards.behavior(from, to, segments, productTypes);
    }

    @GetMapping("/behavior/tree")
    public BehaviorTree tree(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                             @RequestParam(required = false) UUID categoryId,
                             @RequestParam(defaultValue = "false") boolean uncategorized,
                             @RequestParam(required = false) String productType,
                             @RequestParam(required = false) UUID productId,
                             @RequestParam(required = false) UUID variantId,
                             @RequestParam(required = false) List<String> segments,
                             @RequestParam(required = false) List<String> productTypes) {
        String type = productType == null || productType.isBlank() ? null : productType;
        return dashboards.tree(from, to, categoryId, uncategorized, type, productId, variantId, segments, productTypes);
    }
}
