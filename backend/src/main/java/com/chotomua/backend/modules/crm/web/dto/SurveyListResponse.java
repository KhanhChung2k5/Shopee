package com.chotomua.backend.modules.crm.web.dto;

import java.util.List;

/** Danh sách khảo sát. */
public record SurveyListResponse(List<SurveyResponse> surveys) {
}
