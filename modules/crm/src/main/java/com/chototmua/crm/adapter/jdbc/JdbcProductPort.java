package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.port.ProductPort;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Sản phẩm đang bán = {@code products.status = published}. */
@Component
@Profile("crm-db")
public class JdbcProductPort implements ProductPort {

    private final JdbcTemplate jdbc;

    public JdbcProductPort(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean existsActive(UUID productId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM products WHERE id = ? AND status = 'published'",
                Integer.class,
                productId);
        return count != null && count > 0;
    }
}
