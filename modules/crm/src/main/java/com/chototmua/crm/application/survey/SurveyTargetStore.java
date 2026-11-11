package com.chototmua.crm.application.survey;

import com.chototmua.crm.domain.survey.SurveyProductTarget;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho gắn sản phẩm vào khảo sát — in-memory, không DDL. */
public interface SurveyTargetStore {

    void save(SurveyProductTarget target);

    Optional<SurveyProductTarget> find(UUID surveyId);

    List<SurveyProductTarget> findAll();

    void delete(UUID surveyId);
}
