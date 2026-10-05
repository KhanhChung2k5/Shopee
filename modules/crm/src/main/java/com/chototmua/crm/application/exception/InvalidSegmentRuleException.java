package com.chototmua.crm.application.exception;

/** {@code ruleDefinition} không phải preset tuổi / RFM / danh mục. REST trả 422. */
public class InvalidSegmentRuleException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Mô tả preset không hợp lệ. */
    public InvalidSegmentRuleException(String message) {
        super(message);
    }

    /** Khi {@code categoryId} không phải UUID. */
    public InvalidSegmentRuleException(String message, Throwable cause) {
        super(message, cause);
    }
}
