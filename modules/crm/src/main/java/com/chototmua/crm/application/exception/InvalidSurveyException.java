package com.chototmua.crm.application.exception;

/** Phiếu hoặc câu hỏi không hợp lệ, hoặc sửa khi không còn bản nháp. REST trả 422. */
public class InvalidSurveyException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Lý do 422 (nháp, đối tượng, câu trả lời, …). */
    public InvalidSurveyException(String message) {
        super(message);
    }
}
