package com.chotomua.backend.modules.crm.application.survey;

import java.util.UUID;

/** Ghi nhận khảo sát nào đã gửi cho đơn nào — chống gửi trùng (surveyId, orderId). */
public interface SurveyDispatchLog {

    /** Đánh dấu cặp (khảo sát, đơn) là đã gửi; trả {@code false} nếu cặp này đã được gửi trước đó. */
    boolean claim(UUID surveyId, UUID orderId);
}
