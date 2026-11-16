package com.chototmua.crm.web.dto;

import com.chototmua.crm.application.audit.OperationLogActorOption;

/** Nhân viên trong danh sách lọc nhật ký. */
public record OperationLogActorOptionResponse(
        String login,
        String label,
        String department
) {
    public static OperationLogActorOptionResponse from(OperationLogActorOption option) {
        return new OperationLogActorOptionResponse(option.login(), option.label(), option.department());
    }
}
