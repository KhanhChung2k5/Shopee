package com.chototmua.crm.web;

import com.chototmua.crm.application.exception.AddressNotFoundException;
import com.chototmua.crm.application.exception.CampaignNotFoundException;
import com.chototmua.crm.application.exception.ConversationNotFoundException;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidCampaignException;
import com.chototmua.crm.application.exception.InvalidConversationException;
import com.chototmua.crm.application.exception.InvalidCustomerStatusException;
import com.chototmua.crm.application.exception.InvalidSegmentRuleException;
import com.chototmua.crm.application.exception.InvalidSurveyException;
import com.chototmua.crm.application.exception.SegmentLockedException;
import com.chototmua.crm.application.exception.SegmentNotFoundException;
import com.chototmua.crm.application.exception.SurveyNotFoundException;
import com.chototmua.crm.web.dto.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Gom mọi lỗi CRM về một hình JSON: {@code { "error": { "code", "message" } }}.
 * Thông báo luôn tiếng Việt.
 */
@RestControllerAdvice
public class CrmExceptionHandler {

    @ExceptionHandler(CrmForbiddenException.class)
    public ResponseEntity<ApiErrorResponse> forbidden(CrmForbiddenException exception) {
        return json(HttpStatus.FORBIDDEN, "FORBIDDEN", exception.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> accessDenied() {
        return json(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }

    @ExceptionHandler(CustomerNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> notFound(CustomerNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(AddressNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> addressNotFound(AddressNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(InvalidCustomerStatusException.class)
    public ResponseEntity<ApiErrorResponse> invalidStatus(InvalidCustomerStatusException exception) {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_STATUS", exception.getMessage());
    }

    @ExceptionHandler(SegmentLockedException.class)
    public ResponseEntity<ApiErrorResponse> segmentLocked(SegmentLockedException exception) {
        return json(HttpStatus.CONFLICT, "SEGMENT_LOCKED", exception.getMessage());
    }

    @ExceptionHandler(SegmentNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> segmentNotFound(SegmentNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(InvalidSegmentRuleException.class)
    public ResponseEntity<ApiErrorResponse> invalidRule(InvalidSegmentRuleException exception) {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_RULE", exception.getMessage());
    }

    @ExceptionHandler(CampaignNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> campaignNotFound(CampaignNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(InvalidCampaignException.class)
    public ResponseEntity<ApiErrorResponse> invalidCampaign(InvalidCampaignException exception) {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_CAMPAIGN", exception.getMessage());
    }

    @ExceptionHandler(SurveyNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> surveyNotFound(SurveyNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(InvalidSurveyException.class)
    public ResponseEntity<ApiErrorResponse> invalidSurvey(InvalidSurveyException exception) {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_SURVEY", exception.getMessage());
    }

    @ExceptionHandler(ConversationNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> conversationNotFound(ConversationNotFoundException exception) {
        return json(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(InvalidConversationException.class)
    public ResponseEntity<ApiErrorResponse> invalidConversation(InvalidConversationException exception) {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_CONVERSATION", exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> invalidBody() {
        return json(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.");
    }

    private static ResponseEntity<ApiErrorResponse> json(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status.value()).body(ApiErrorResponse.of(code, message));
    }
}
