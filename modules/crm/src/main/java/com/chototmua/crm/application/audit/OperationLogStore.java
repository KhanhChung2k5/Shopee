package com.chototmua.crm.application.audit;

import com.chototmua.crm.domain.audit.OperationLog;

/** Kho nhật ký thao tác. Bản ghi chỉ thêm, không sửa. */
public interface OperationLogStore {

    void append(OperationLog log);

    OperationLogPage search(OperationLogQuery query);

    OperationLogFacets facets();

    boolean isEmpty();
}
