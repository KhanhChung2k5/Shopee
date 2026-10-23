package com.chotomua.backend.modules.crm.application.audit;

import com.chotomua.backend.modules.crm.domain.audit.OperationLog;

/** Kho nhật ký thao tác. Bản ghi chỉ thêm, không sửa. */
public interface OperationLogStore {

    void append(OperationLog log);

    OperationLogPage search(OperationLogQuery query);

    OperationLogFacets facets();

    boolean isEmpty();
}
