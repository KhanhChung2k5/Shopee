package com.chotomua.backend.modules.crm.web.notification;

import com.chotomua.backend.modules.crm.application.campaign.CampaignService;
import com.chotomua.backend.modules.crm.web.CurrentActor;
import com.chotomua.backend.modules.crm.web.dto.NotificationListResponse;
import com.chotomua.backend.modules.crm.web.dto.NotificationResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Hộp thư in-app. Khách đọc của mình; nhân viên CRM được xem hộp thư một khách. */
@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final CampaignService campaigns;
    private final CurrentActor currentActor;

    public NotificationController(CampaignService campaigns, CurrentActor currentActor) {
        this.campaigns = campaigns;
        this.currentActor = currentActor;
    }

    @GetMapping
    public NotificationListResponse inbox(@RequestParam(required = false) UUID userId) {
        return campaigns.inbox(currentActor.requireUserId(), userId);
    }

    /** Khách mở thư của mình thì đánh dấu đã đọc. */
    @PostMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable UUID id) {
        return campaigns.markRead(currentActor.requireUserId(), id);
    }
}
