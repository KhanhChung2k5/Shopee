package com.chototmua.crm.web.dto;

/**
 * Thân lỗi thống nhất cho mọi API CRM.
 * {@code message} luôn tiếng Việt để giao diện hiện đúng.
 */
public record ApiErrorResponse(ErrorBody error) {

    public record ErrorBody(String code, String message) {
    }

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(new ErrorBody(code, message));
    }
}
