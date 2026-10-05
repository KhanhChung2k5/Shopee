package com.chototmua.crm.web.profile;

import com.chototmua.crm.application.profile.CustomerProfileService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.dto.CustomerProfileResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST hồ sơ CRM. Nghiệp vụ ở service — controller chỉ dịch HTTP.
 * Quản trị, quản lý CRM và CSKH. NV Kinh doanh bị 403.
 */
@RestController
@RequestMapping("/api/crm/profiles")
@PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
public class CustomerProfileController {

    private final CustomerProfileService profiles;
    private final CurrentActor currentActor;

    public CustomerProfileController(CustomerProfileService profiles, CurrentActor currentActor) {
        this.profiles = profiles;
        this.currentActor = currentActor;
    }

    @GetMapping("/{userId}")
    public CustomerProfileResponse get(@PathVariable UUID userId) {
        return profiles.get(currentActor.requireUserId(), userId);
    }

    @PostMapping("/{userId}/recalculate")
    public CustomerProfileResponse recalculate(@PathVariable UUID userId) {
        return profiles.recalculate(currentActor.requireUserId(), userId);
    }
}
