package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.application.survey.SurveyDispatchLog;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Dấu đã gửi khảo sát trên {@code survey_order_dispatches} (V6) — khóa chính (survey_id, order_id) chặn gửi trùng. */
@Component
@Profile("!crm-fake")
public class JdbcSurveyDispatchLog implements SurveyDispatchLog {

    private final JdbcTemplate jdbc;

    public JdbcSurveyDispatchLog(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean claim(UUID surveyId, UUID orderId) {
        return jdbc.update("INSERT INTO survey_order_dispatches (survey_id, order_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                surveyId, orderId) == 1;
    }
}
