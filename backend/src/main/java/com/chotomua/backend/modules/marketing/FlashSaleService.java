package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.FlashSaleResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FlashSaleService {

    private static final String ACTIVE_FLASH_SALES = """
            select d.id, p.id as product_id, v.id as variant_id, v.sku,
                   p.name as product_name, p.product_type,
                   coalesce(v.image_url, p.image_urls ->> 0) as image_url,
                   v.price as original_price, d.flash_price, d.sold_qty, d.limit_qty,
                   program.end_at
            from promotion_product_details d
            join promotion_programs program on program.id = d.promotion_program_id
            join product_variants v on v.id = d.variant_id
            join products p on p.id = v.product_id
            where d.flash_price is not null
              and d.flash_price < v.price
              and d.sold_qty < d.limit_qty
              and program.start_at <= now() and program.end_at > now()
              and p.status = 'published' and v.status = 'active'
              and (program.target_loyalty_tier is null
                   or lower(program.target_loyalty_tier) = lower(?))
            order by program.end_at asc, v.sku asc
            """;

    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public FlashSaleService(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<FlashSaleResponse> list(UUID buyerId) {
        String tier = buyerId == null ? null : users.findById(buyerId)
                .map(user -> user.getLoyaltyTier()).orElse(null);
        return jdbc.query(ACTIVE_FLASH_SALES, (rs, rowNum) -> map(rs), tier);
    }

    private static FlashSaleResponse map(ResultSet rs) throws SQLException {
        return new FlashSaleResponse(
                rs.getObject("id", UUID.class), rs.getObject("product_id", UUID.class),
                rs.getObject("variant_id", UUID.class), rs.getString("sku"),
                rs.getString("product_name"), rs.getString("product_type"), rs.getString("image_url"),
                rs.getBigDecimal("original_price"), rs.getBigDecimal("flash_price"),
                rs.getInt("sold_qty"), rs.getInt("limit_qty"),
                rs.getObject("end_at", java.time.OffsetDateTime.class));
    }
}
