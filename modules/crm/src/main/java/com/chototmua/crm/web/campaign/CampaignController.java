package com.chototmua.crm.web.campaign;

import com.chototmua.crm.application.campaign.CampaignService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.CampaignListResponse;
import com.chototmua.crm.web.dto.CampaignRecipientListResponse;
import com.chototmua.crm.web.dto.CampaignResponse;
import com.chototmua.crm.web.dto.CreateCampaignRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.chototmua.crm.web.dto.UpdateCampaignRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Chiến dịch chăm sóc trong ứng dụng. Quản trị, quản lý CRM và CSKH.
 * Không có đường voucher hay flash sale.
 */
@RestController
@RequestMapping("/api/campaigns")
@PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
public class CampaignController {

    private final CampaignService campaigns;
    private final CurrentActor currentActor;

    public CampaignController(CampaignService campaigns, CurrentActor currentActor) {
        this.campaigns = campaigns;
        this.currentActor = currentActor;
    }

    @GetMapping
    public CampaignListResponse list() {
        return campaigns.list(currentActor.requireUserId());
    }

    @GetMapping("/{id}")
    public CampaignResponse get(@PathVariable UUID id) {
        return campaigns.get(currentActor.requireUserId(), id);
    }

    @GetMapping("/{id}/recipients")
    public CampaignRecipientListResponse recipients(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return campaigns.recipients(currentActor.requireUserId(), id, offset, limit);
    }

    @PostMapping
    public ResponseEntity<CampaignResponse> create(@Valid @RequestBody CreateCampaignRequest request) {
        CampaignResponse created = campaigns.send(
                currentActor.requireUserId(),
                request.name(),
                request.segmentIds(),
                request.content(),
                request.surveyId(),
                request.startAt(),
                request.endAt());
        return ResponseEntity.created(ResourceLocation.of("/api/campaigns/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public CampaignResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateCampaignRequest request) {
        return campaigns.update(
                currentActor.requireUserId(), id, request.name(), request.content(), request.startAt());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        campaigns.delete(currentActor.requireUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
