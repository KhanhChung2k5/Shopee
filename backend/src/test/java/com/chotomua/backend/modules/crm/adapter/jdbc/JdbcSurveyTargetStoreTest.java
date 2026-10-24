package com.chotomua.backend.modules.crm.adapter.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.application.survey.SurveyTargetStore;
import com.chotomua.backend.modules.crm.domain.survey.SurveyProductTarget;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Survey product targets survive in the database (V5) instead of in memory. Rolled back after each test. */
@SpringBootTest(classes = BackendApplication.class)
@Transactional
class JdbcSurveyTargetStoreTest {

    @Autowired
    private SurveyTargetStore store;

    @Autowired
    private JdbcTemplate jdbc;

    private final UUID surveyId = UUID.randomUUID();

    @BeforeEach
    void seedSurvey() {
        UUID employee = jdbc.queryForObject("SELECT id FROM employees LIMIT 1", UUID.class);
        jdbc.update("INSERT INTO surveys (id, created_by_employee_id, title, status) VALUES (?, ?, 'NPS thử', 'draft')",
                surveyId, employee);
    }

    @Test
    void savesReadsOverwritesAndDeletesTargets() {
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        ProductFilter filter = new ProductFilter("dualsense", "controller", null, null, "PS5",
                new BigDecimal("500000.00"), null, true);

        store.save(new SurveyProductTarget(surveyId, List.of(p1, p2), filter));

        assertThat(store).isInstanceOf(JdbcSurveyTargetStore.class);
        SurveyProductTarget read = store.find(surveyId).orElseThrow();
        assertThat(read.productIds()).containsExactly(p1, p2);
        assertThat(read.filter()).isEqualTo(filter);
        assertThat(store.findAll()).extracting(SurveyProductTarget::surveyId).contains(surveyId);

        store.save(new SurveyProductTarget(surveyId, List.of(p2), null));
        SurveyProductTarget overwritten = store.find(surveyId).orElseThrow();
        assertThat(overwritten.productIds()).containsExactly(p2);
        assertThat(overwritten.filter()).isNull();

        store.delete(surveyId);
        assertThat(store.find(surveyId)).isEmpty();
    }

    @Test
    void deletingTheSurveyRemovesItsTargets() {
        store.save(new SurveyProductTarget(surveyId, List.of(UUID.randomUUID()), null));
        jdbc.update("DELETE FROM surveys WHERE id = ?", surveyId);
        assertThat(store.find(surveyId)).isEmpty();
    }
}
