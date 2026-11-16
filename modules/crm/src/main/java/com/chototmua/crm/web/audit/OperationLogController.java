package com.chototmua.crm.web.audit;

import com.chototmua.crm.application.audit.OperationLogPage;
import com.chototmua.crm.application.audit.OperationLogService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.dto.OperationLogFacetsResponse;
import com.chototmua.crm.web.dto.OperationLogItem;
import com.chototmua.crm.web.dto.OperationLogListResponse;
import com.chototmua.crm.web.dto.PaginationResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST nhật ký thao tác. Chỉ quản trị viên.
 * Có thể lọc kết hợp: nhân viên, phòng ban, thao tác, kết quả và tìm tự do.
 */
@RestController
@RequestMapping("/api/crm/audit-logs")
public class OperationLogController {

    private final OperationLogService logs;
    private final CurrentActor currentActor;

    public OperationLogController(OperationLogService logs, CurrentActor currentActor) {
        this.logs = logs;
        this.currentActor = currentActor;
    }

    @GetMapping("/filters")
    @PreAuthorize("hasAuthority('admin')")
    public OperationLogFacetsResponse filters() {
        return OperationLogFacetsResponse.from(logs.facets(currentActor.requireUserId()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('admin')")
    public OperationLogListResponse list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String outcome,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        OperationLogPage result = logs.list(
                currentActor.requireUserId(),
                q,
                actor,
                department,
                action,
                outcome,
                page,
                pageSize);
        return new OperationLogListResponse(
                result.data().stream().map(OperationLogItem::from).toList(),
                new PaginationResponse(result.page(), result.pageSize(), result.totalItems(), result.totalPages()));
    }
}
