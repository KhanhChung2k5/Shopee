package com.chototmua.crm.application.audit;

/** Một nhân viên từng xuất hiện trong nhật ký, dùng cho dropdown lọc. */
public record OperationLogActorOption(
        String login,
        String label,
        String department
) {
}
