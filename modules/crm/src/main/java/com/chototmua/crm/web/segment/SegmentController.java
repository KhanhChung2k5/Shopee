package com.chototmua.crm.web.segment;

import com.chototmua.crm.application.segment.SegmentService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.SegmentListResponse;
import com.chototmua.crm.web.dto.SegmentResponse;
import com.chototmua.crm.web.dto.UpsertSegmentRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST phân khúc preset — đầu vào campaign in-app.
 * Quản trị, quản lý CRM và CSKH. NV Kinh doanh và khách bị 403.
 */
@RestController
@RequestMapping("/api/segments")
@PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
public class SegmentController {

    private final SegmentService segments;
    private final CurrentActor currentActor;

    public SegmentController(SegmentService segments, CurrentActor currentActor) {
        this.segments = segments;
        this.currentActor = currentActor;
    }

    @GetMapping
    public SegmentListResponse list() {
        return segments.list(currentActor.requireUserId());
    }

    @GetMapping("/{id}")
    public SegmentResponse get(@PathVariable UUID id) {
        return segments.get(currentActor.requireUserId(), id);
    }

    @PostMapping
    public ResponseEntity<SegmentResponse> create(@Valid @RequestBody UpsertSegmentRequest request) {
        SegmentResponse created = segments.create(
                currentActor.requireUserId(),
                request.name(),
                request.ruleDefinition());
        return ResponseEntity.created(ResourceLocation.of("/api/segments/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public SegmentResponse update(@PathVariable UUID id, @Valid @RequestBody UpsertSegmentRequest request) {
        return segments.update(
                currentActor.requireUserId(),
                id,
                request.name(),
                request.ruleDefinition());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        segments.delete(currentActor.requireUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/refresh")
    public SegmentResponse refresh(@PathVariable UUID id) {
        return segments.refresh(currentActor.requireUserId(), id);
    }
}
