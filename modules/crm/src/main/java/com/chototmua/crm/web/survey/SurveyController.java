package com.chototmua.crm.web.survey;

import com.chototmua.crm.application.survey.SurveyService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.CreateSurveyRequest;
import com.chototmua.crm.web.dto.SendSurveyRequest;
import com.chototmua.crm.web.dto.SurveyListResponse;
import com.chototmua.crm.web.dto.SurveyResponse;
import com.chototmua.crm.web.dto.SurveySendResponse;
import com.chototmua.crm.web.dto.UpdateSurveyRequest;
import com.chototmua.crm.web.dto.UpsertSurveyQuestionRequest;
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
 * Tạo khảo sát và câu hỏi. Quản trị, quản lý CRM và CSKH.
 * Gửi tới khách qua chiến dịch in-app, hoặc đưa thẳng vào hòm thư.
 */
@RestController
@RequestMapping("/api/surveys")
@PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
public class SurveyController {

    private final SurveyService surveys;
    private final CurrentActor currentActor;

    public SurveyController(SurveyService surveys, CurrentActor currentActor) {
        this.surveys = surveys;
        this.currentActor = currentActor;
    }

    @GetMapping
    public SurveyListResponse list() {
        return surveys.list(currentActor.requireUserId());
    }

    @GetMapping("/{id}")
    public SurveyResponse get(@PathVariable UUID id) {
        return surveys.get(currentActor.requireUserId(), id);
    }

    @PostMapping
    public ResponseEntity<SurveyResponse> create(@Valid @RequestBody CreateSurveyRequest request) {
        SurveyResponse created = surveys.create(
                currentActor.requireUserId(),
                request.title(),
                request.description(),
                request.segmentIds());
        return ResponseEntity.created(ResourceLocation.of("/api/surveys/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public SurveyResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSurveyRequest request) {
        return surveys.update(
                currentActor.requireUserId(),
                id,
                request.title(),
                request.description(),
                request.segmentIds());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        surveys.delete(currentActor.requireUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    public SurveyResponse archive(@PathVariable UUID id) {
        return surveys.archive(currentActor.requireUserId(), id);
    }

    @PostMapping("/{id}/inbox")
    public SurveySendResponse sendToInbox(@PathVariable UUID id, @Valid @RequestBody SendSurveyRequest request) {
        return surveys.sendToInbox(currentActor.requireUserId(), id, request.segmentIds());
    }

    @PostMapping("/{id}/questions")
    public SurveyResponse addQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertSurveyQuestionRequest request
    ) {
        return surveys.addQuestion(
                currentActor.requireUserId(),
                id,
                request.questionText(),
                request.answerType(),
                request.options(),
                request.sortOrder());
    }

    @PutMapping("/{id}/questions/{questionId}")
    public SurveyResponse updateQuestion(
            @PathVariable UUID id,
            @PathVariable UUID questionId,
            @Valid @RequestBody UpsertSurveyQuestionRequest request
    ) {
        return surveys.updateQuestion(
                currentActor.requireUserId(),
                id,
                questionId,
                request.questionText(),
                request.answerType(),
                request.options(),
                request.sortOrder());
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    public SurveyResponse deleteQuestion(@PathVariable UUID id, @PathVariable UUID questionId) {
        return surveys.deleteQuestion(currentActor.requireUserId(), id, questionId);
    }
}
