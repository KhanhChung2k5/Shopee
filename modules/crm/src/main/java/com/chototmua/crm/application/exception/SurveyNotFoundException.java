package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Khảo sát hoặc câu hỏi không còn trong kho — lớp REST trả 404. */
public class SurveyNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã khảo sát vào thông báo lỗi. */
    public SurveyNotFoundException(UUID surveyId) {
        super("Không tìm thấy khảo sát: " + surveyId);
    }

    /** Khi thiếu câu hỏi hoặc thông báo tùy biến. */
    public SurveyNotFoundException(String message) {
        super(message);
    }
}
