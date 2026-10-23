package com.chotomua.backend.modules.crm.web.survey;

import com.chotomua.backend.modules.crm.application.survey.SurveyTargetService;
import com.chotomua.backend.modules.crm.web.CurrentActor;
import com.chotomua.backend.modules.crm.web.dto.SurveyProductTargetRequest;
import com.chotomua.backend.modules.crm.web.dto.SurveyProductTargetResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Gắn sản phẩm vào khảo sát. Quản trị, quản lý CRM và CSKH.
 */
@RestController
@RequestMapping({"/api/crm/surveys", "/api/surveys"})
@PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
public class SurveyProductTargetController {

    private final SurveyTargetService targets;
    private final CurrentActor currentActor;

    public SurveyProductTargetController(SurveyTargetService targets, CurrentActor currentActor) {
        this.targets = targets;
        this.currentActor = currentActor;
    }

    @PutMapping("/{id}/product-target")
    public SurveyProductTargetResponse set(
            @PathVariable UUID id,
            @RequestBody(required = false) SurveyProductTargetRequest request
    ) {
        SurveyProductTargetRequest body = request == null
                ? new SurveyProductTargetRequest(null, null)
                : request;
        return targets.set(currentActor.requireUserId(), id, body.productIds(), body.filter());
    }

    @GetMapping("/{id}/product-target")
    public SurveyProductTargetResponse get(@PathVariable UUID id) {
        return targets.get(currentActor.requireUserId(), id);
    }
}
