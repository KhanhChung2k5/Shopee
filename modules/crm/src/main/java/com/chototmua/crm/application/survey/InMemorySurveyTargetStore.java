package com.chototmua.crm.application.survey;

import com.chototmua.crm.domain.survey.SurveyProductTarget;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Gắn sản phẩm vào khảo sát trong bộ nhớ. Mất khi restart — đúng SPEC mở rộng. */
@Component
public class InMemorySurveyTargetStore implements SurveyTargetStore {

    private final Map<UUID, SurveyProductTarget> targets = new LinkedHashMap<>();

    /** Xóa hết — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        targets.clear();
    }

    @Override
    public synchronized void save(SurveyProductTarget target) {
        targets.put(target.surveyId(), target);
    }

    @Override
    public synchronized Optional<SurveyProductTarget> find(UUID surveyId) {
        return Optional.ofNullable(targets.get(surveyId));
    }

    @Override
    public synchronized List<SurveyProductTarget> findAll() {
        return List.copyOf(new ArrayList<>(targets.values()));
    }

    @Override
    public synchronized void delete(UUID surveyId) {
        targets.remove(surveyId);
    }
}
