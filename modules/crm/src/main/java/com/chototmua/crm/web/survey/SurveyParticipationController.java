package com.chototmua.crm.web.survey;

import com.chototmua.crm.application.survey.SurveyService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.CustomerSurveySheetResponse;
import com.chototmua.crm.web.dto.SubmitSurveyRequest;
import com.chototmua.crm.web.dto.SurveyStatsResponse;
import com.chototmua.crm.web.dto.SurveySubmissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Khách nộp khảo sát đã nhận trong ứng dụng. Nhân viên xem thống kê.
 * Không gửi thư điện tử.
 */
@RestController
@RequestMapping("/api/surveys")
public class SurveyParticipationController {

    private final SurveyService surveys;
    private final CurrentActor currentActor;

    public SurveyParticipationController(SurveyService surveys, CurrentActor currentActor) {
        this.surveys = surveys;
        this.currentActor = currentActor;
    }

    @GetMapping("/{id}/sheet")
    @PreAuthorize("hasAuthority('customer')")
    public CustomerSurveySheetResponse sheet(@PathVariable UUID id) {
        return surveys.sheet(currentActor.requireUserId(), id);
    }

    @PostMapping("/{id}/responses")
    @PreAuthorize("hasAuthority('customer')")
    public ResponseEntity<SurveySubmissionResponse> submit(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitSurveyRequest request
    ) {
        SurveySubmissionResponse created = surveys.submit(
                currentActor.requireUserId(),
                id,
                request.orderId(),
                request.answers());
        return ResponseEntity.created(
                ResourceLocation.of("/api/surveys/" + id + "/responses/" + created.id())).body(created);
    }

    @GetMapping("/{id}/stats")
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
    public SurveyStatsResponse stats(@PathVariable UUID id) {
        return surveys.stats(currentActor.requireUserId(), id);
    }
}
