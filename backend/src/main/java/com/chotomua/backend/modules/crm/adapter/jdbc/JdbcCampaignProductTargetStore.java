package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.application.campaign.CampaignProductTargetStore;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Sản phẩm mục tiêu của chiến dịch trên {@code campaign_product_targets} (V6) — giữ được qua các lần khởi động lại. */
@Component
@Profile("!crm-fake")
public class JdbcCampaignProductTargetStore implements CampaignProductTargetStore {

    private static final TypeReference<List<UUID>> UUID_LIST = new TypeReference<>() { };

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public JdbcCampaignProductTargetStore(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(CampaignProductTarget target) {
        jdbc.update("""
                INSERT INTO campaign_product_targets (campaign_id, product_ids, filter, updated_at)
                VALUES (?, ?::jsonb, ?::jsonb, now())
                ON CONFLICT (campaign_id) DO UPDATE
                SET product_ids = EXCLUDED.product_ids, filter = EXCLUDED.filter, updated_at = now()
                """,
                target.campaignId(),
                objectMapper.writeValueAsString(target.productIds()),
                target.filter() == null ? null : objectMapper.writeValueAsString(target.filter()));
    }

    @Override
    public Optional<CampaignProductTarget> find(UUID campaignId) {
        return jdbc.query("SELECT campaign_id, product_ids, filter FROM campaign_product_targets WHERE campaign_id = ?",
                this::map, campaignId).stream().findFirst();
    }

    @Override
    public void delete(UUID campaignId) {
        jdbc.update("DELETE FROM campaign_product_targets WHERE campaign_id = ?", campaignId);
    }

    private CampaignProductTarget map(ResultSet rs, int rowNum) throws SQLException {
        String filter = rs.getString("filter");
        return new CampaignProductTarget(
                rs.getObject("campaign_id", UUID.class),
                objectMapper.readValue(rs.getString("product_ids"), UUID_LIST),
                filter == null ? null : objectMapper.readValue(filter, ProductFilter.class));
    }
}
