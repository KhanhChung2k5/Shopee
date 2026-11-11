package com.chototmua.crm.application.audit;

/**
 * Bộ lọc nhật ký. Các trường rỗng thì bỏ qua.
 * Có thể dùng cùng lúc: nhân viên + phòng ban + thao tác + kết quả + tìm tự do.
 */
public record OperationLogQuery(
        String text,
        String actorLogin,
        String department,
        String action,
        String outcome,
        int page,
        int pageSize
) {
}
