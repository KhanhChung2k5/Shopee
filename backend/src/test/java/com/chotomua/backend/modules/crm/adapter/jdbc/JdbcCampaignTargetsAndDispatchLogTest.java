package com.chotomua.backend.modules.crm.adapter.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.application.campaign.CampaignProductTargetStore;
import com.chotomua.backend.modules.crm.application.survey.SurveyDispatchLog;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** V6: campaign product targets and the survey-per-order dispatch marks live in the database. Rolled back after each test. */
@SpringBootTest(classes = BackendApplication.class)
@Transactional
class JdbcCampaignTargetsAndDispatchLogTest {

    @Autowired
    private CampaignProductTargetStore campaignTargets;

    @Autowired
    private SurveyDispatchLog dispatchLog;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void campaignTargetsAreStoredOverwrittenAndRemovedWithTheCampaign() {
        UUID campaign = UUID.randomUUID();
        jdbc.update("INSERT INTO campaigns (id, name, channel) VALUES (?, 'Chiến dịch thử', 'in_app')", campaign);
        UUID product = UUID.randomUUID();
        ProductFilter filter = new ProductFilter(null, "game_disc", null, "Hành động", "PS5", null, null, true);

        campaignTargets.save(new CampaignProductTarget(campaign, List.of(product), filter));

        assertThat(campaignTargets).isInstanceOf(JdbcCampaignProductTargetStore.class);
        CampaignProductTarget read = campaignTargets.find(campaign).orElseThrow();
        assertThat(read.productIds()).containsExactly(product);
        assertThat(read.filter()).isEqualTo(filter);

        campaignTargets.save(new CampaignProductTarget(campaign, List.of(), null));
        assertThat(campaignTargets.find(campaign).orElseThrow().productIds()).isEmpty();

        jdbc.update("DELETE FROM campaigns WHERE id = ?", campaign);
        assertThat(campaignTargets.find(campaign)).isEmpty();
    }

    @Test
    void aSurveyIsClaimedOnlyOncePerOrder() {
        UUID employee = jdbc.queryForObject("SELECT id FROM employees LIMIT 1", UUID.class);
        UUID survey = UUID.randomUUID();
        jdbc.update("INSERT INTO surveys (id, created_by_employee_id, title, status) VALUES (?, ?, 'NPS thử', 'sent')",
                survey, employee);
        UUID order = jdbc.queryForObject("SELECT id FROM orders LIMIT 1", UUID.class);

        assertThat(dispatchLog).isInstanceOf(JdbcSurveyDispatchLog.class);
        assertThat(dispatchLog.claim(survey, order)).isTrue();
        assertThat(dispatchLog.claim(survey, order)).isFalse();
    }
}
