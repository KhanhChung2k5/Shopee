package com.chotomua.backend.modules.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Chạy các câu SQL dashboard trên schema thật để bắt lỗi cú pháp. */
@SpringBootTest
class OpsDashboardServiceTest {

    @Autowired
    private OpsDashboardService dashboards;

    @Test
    void reportsAndTreeQueryTheLiveSchema() {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(89);
        SalesOpsReport sales = dashboards.sales(from, to);
        MarketingOpsReport marketing = dashboards.marketing(from, to);
        BehaviorReport behavior = dashboards.behavior(from, to);
        BehaviorTree root = dashboards.tree(from, to, null, false, null, null, null);

        assertThat(sales.months()).isNotEmpty();
        assertThat(sales.priorNetProduct()).isNotNull();
        assertThat(sales.byProductType()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(sales.stages()).hasSize(3);
        assertThat(marketing.mechanisms()).hasSize(3);
        assertThat(marketing.tiers()).hasSize(8);
        assertThat(behavior.intervals()).hasSize(5);
        assertThat(behavior.intervals()).allSatisfy(bucket -> assertThat(bucket.segments()).isNotNull());
        assertThat(root.level()).isEqualTo("root");
        assertThat(root.orders()).isEqualTo(behavior.orders());

        dashboards.tree(from, to, null, true, "game_disc", null, null);

        assertThat(dashboards.sales(from, to, java.util.List.of("champions"), java.util.List.of("game_disc")).byProductType())
                .extracting(SalesOpsReport.ProductType::productType)
                .containsExactly("game_disc");
        assertThat(dashboards.marketing(from, to, java.util.List.of("loyal"), java.util.List.of("accessory")).tiers())
                .extracting(MarketingOpsReport.TierEffect::tier)
                .containsExactly("loyal");
        dashboards.behavior(from, to, java.util.List.of("at_risk", "lost"), java.util.List.of("controller"));
        dashboards.tree(from, to, null, false, null, null, null, java.util.List.of("new"), java.util.List.of("game_disc"));
    }
}
