package com.chototmua.crm.application.audit;

import java.util.List;

/** Giá trị lọc có trong nhật ký: nhân viên, phòng ban, thao tác. */
public record OperationLogFacets(
        List<OperationLogActorOption> actors,
        List<String> departments,
        List<String> actions
) {
}
