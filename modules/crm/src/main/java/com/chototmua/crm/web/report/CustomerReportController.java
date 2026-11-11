package com.chototmua.crm.web.report;

import com.chototmua.crm.application.report.CampaignFunnelService;
import com.chototmua.crm.application.report.CustomerReportService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.dto.CampaignFunnelResponse;
import com.chototmua.crm.web.dto.CustomerReportResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST báo cáo CRM: nhân khẩu và funnel chiến dịch in-app.
 * Nghiệp vụ ở service — controller chỉ dịch HTTP.
 */
@RestController
@RequestMapping("/api/crm/reports")
public class CustomerReportController {

    private final CustomerReportService reports;
    private final CampaignFunnelService campaignFunnels;
    private final CurrentActor currentActor;

    public CustomerReportController(
            CustomerReportService reports,
            CampaignFunnelService campaignFunnels,
            CurrentActor currentActor
    ) {
        this.reports = reports;
        this.campaignFunnels = campaignFunnels;
        this.currentActor = currentActor;
    }

    @GetMapping("/customers")
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
    public CustomerReportResponse customers() {
        return reports.build(currentActor.requireUserId());
    }

    @GetMapping("/campaigns/{id}/funnel")
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
    public CampaignFunnelResponse campaignFunnel(@PathVariable UUID id) {
        return campaignFunnels.build(currentActor.requireUserId(), id);
    }
}
