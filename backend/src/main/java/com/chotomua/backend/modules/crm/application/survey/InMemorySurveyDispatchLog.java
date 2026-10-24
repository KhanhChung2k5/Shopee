package com.chotomua.backend.modules.crm.application.survey;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Dấu đã gửi khảo sát trong bộ nhớ — chỉ cho profile test {@code crm-fake}; chạy thật dùng {@code JdbcSurveyDispatchLog}. */
@Component
@Profile("crm-fake")
public class InMemorySurveyDispatchLog implements SurveyDispatchLog {

    private final Set<String> dispatched = new HashSet<>();

    /** Xóa hết — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        dispatched.clear();
    }

    @Override
    public synchronized boolean claim(UUID surveyId, UUID orderId) {
        return dispatched.add(surveyId + ":" + orderId);
    }
}
