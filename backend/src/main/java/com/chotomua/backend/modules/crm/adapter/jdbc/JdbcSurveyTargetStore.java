package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.application.survey.SurveyTargetStore;
import com.chotomua.backend.modules.crm.domain.survey.SurveyProductTarget;
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

/** Sản phẩm mục tiêu của khảo sát trên {@code survey_product_targets} (V5) — giữ được qua các lần khởi động lại. */
@Component
@Profile("!crm-fake")
public class JdbcSurveyTargetStore implements SurveyTargetStore {

    private static final TypeReference<List<UUID>> UUID_LIST = new TypeReference<>() { };

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public JdbcSurveyTargetStore(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(SurveyProductTarget target) {
        jdbc.update("""
                INSERT INTO survey_product_targets (survey_id, product_ids, filter, updated_at)
                VALUES (?, ?::jsonb, ?::jsonb, now())
                ON CONFLICT (survey_id) DO UPDATE
                SET product_ids = EXCLUDED.product_ids, filter = EXCLUDED.filter, updated_at = now()
                """,
                target.surveyId(),
                objectMapper.writeValueAsString(target.productIds()),
                target.filter() == null ? null : objectMapper.writeValueAsString(target.filter()));
    }

    @Override
    public Optional<SurveyProductTarget> find(UUID surveyId) {
        return jdbc.query("SELECT survey_id, product_ids, filter FROM survey_product_targets WHERE survey_id = ?",
                this::map, surveyId).stream().findFirst();
    }

    @Override
    public List<SurveyProductTarget> findAll() {
        return jdbc.query("SELECT survey_id, product_ids, filter FROM survey_product_targets ORDER BY updated_at", this::map);
    }

    @Override
    public void delete(UUID surveyId) {
        jdbc.update("DELETE FROM survey_product_targets WHERE survey_id = ?", surveyId);
    }

    private SurveyProductTarget map(ResultSet rs, int rowNum) throws SQLException {
        String filter = rs.getString("filter");
        return new SurveyProductTarget(
                rs.getObject("survey_id", UUID.class),
                objectMapper.readValue(rs.getString("product_ids"), UUID_LIST),
                filter == null ? null : objectMapper.readValue(filter, ProductFilter.class));
    }
}
