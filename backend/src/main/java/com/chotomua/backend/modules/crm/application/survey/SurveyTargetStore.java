package com.chotomua.backend.modules.crm.application.survey;

import com.chotomua.backend.modules.crm.domain.survey.SurveyProductTarget;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho gắn sản phẩm vào khảo sát — bảng {@code survey_product_targets} (V5); bản in-memory chỉ cho test. */
public interface SurveyTargetStore {

    void save(SurveyProductTarget target);

    Optional<SurveyProductTarget> find(UUID surveyId);

    List<SurveyProductTarget> findAll();

    void delete(UUID surveyId);
}
