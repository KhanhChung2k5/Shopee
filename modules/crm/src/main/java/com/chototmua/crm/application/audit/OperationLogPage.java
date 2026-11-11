package com.chototmua.crm.application.audit;

import com.chototmua.crm.domain.audit.OperationLog;

import java.util.List;

/** Một trang nhật ký, mới nhất trước. */
public record OperationLogPage(
        List<OperationLog> data,
        int page,
        int pageSize,
        long totalItems
) {
    public int totalPages() {
        if (pageSize <= 0 || totalItems <= 0) {
            return 0;
        }
        return (int) ((totalItems + pageSize - 1) / pageSize);
    }
}
