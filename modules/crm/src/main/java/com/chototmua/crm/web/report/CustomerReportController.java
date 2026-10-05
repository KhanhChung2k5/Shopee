package com.chototmua.crm.web.report;

import com.chototmua.crm.application.report.CustomerReportService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.dto.CustomerReportResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST báo cáo nhân khẩu. Nghiệp vụ ở service — controller chỉ dịch HTTP.
 * Câu chuyện 5: quản trị, quản lý CRM và CSKH.
 */
@RestController
@RequestMapping("/api/crm/reports")
public class CustomerReportController {

    private final CustomerReportService reports;
    private final CurrentActor currentActor;

    public CustomerReportController(CustomerReportService reports, CurrentActor currentActor) {
        this.reports = reports;
        this.currentActor = currentActor;
    }

    @GetMapping("/customers")
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
    public CustomerReportResponse customers() {
        return reports.build(currentActor.requireUserId());
    }
}
