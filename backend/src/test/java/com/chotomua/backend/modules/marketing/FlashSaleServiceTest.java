package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FlashSaleServiceTest {

    @Autowired
    private FlashSaleService service;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void listsActivePublishedDealsAndRespectsBuyerTier() {
        UUID productId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        UUID buyerId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("insert into products(id, name, status, product_type) values (?, ?, ?, ?)",
                productId, "Tay cầm thử nghiệm", "published", "controller");
        jdbc.update("insert into product_variants(id, product_id, sku, price, status) values (?, ?, ?, ?, ?)",
                variantId, productId, "TEST-" + variantId, new BigDecimal("500000.00"), "active");
        jdbc.update("insert into users(id, role, password_hash, loyalty_tier) values (?, ?, ?, ?)",
                buyerId, "buyer", "hash", "gold");

        UUID openDeal = promotion(variantId, null, now.minusDays(1), now.plusHours(2), 2, 10);
        UUID goldDeal = promotion(variantId, "gold", now.minusDays(1), now.plusHours(3), 0, 10);
        promotion(variantId, null, now.minusDays(1), now.plusHours(1), 10, 10);
        promotion(variantId, null, now.plusHours(1), now.plusDays(1), 0, 10);

        var publicDeals = service.list(null);
        var goldDeals = service.list(buyerId);

        assertThat(publicDeals).extracting("id").containsExactly(openDeal);
        assertThat(publicDeals.getFirst().flashPrice()).isEqualByComparingTo("300000.00");
        assertThat(publicDeals.getFirst().productName()).isEqualTo("Tay cầm thử nghiệm");
        assertThat(goldDeals).extracting("id").containsExactly(openDeal, goldDeal);
    }

    private UUID promotion(UUID variantId, String tier, OffsetDateTime start, OffsetDateTime end,
                           int soldQty, int limitQty) {
        UUID programId = UUID.randomUUID();
        UUID detailId = UUID.randomUUID();
        jdbc.update("""
                insert into promotion_programs(id, code, name, program_type, target_loyalty_tier, start_at, end_at)
                values (?, ?, ?, ?, ?, ?, ?)
                """, programId, "TEST-" + programId, "Flash Sale", "seasonal", tier, start, end);
        jdbc.update("""
                insert into promotion_product_details(id, promotion_program_id, variant_id, flash_price, limit_qty, sold_qty)
                values (?, ?, ?, ?, ?, ?)
                """, detailId, programId, variantId, new BigDecimal("300000.00"), limitQty, soldQty);
        return detailId;
    }
}
