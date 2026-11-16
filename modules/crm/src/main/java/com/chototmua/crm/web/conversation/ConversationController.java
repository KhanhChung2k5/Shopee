package com.chototmua.crm.web.conversation;

import com.chototmua.crm.application.conversation.ConversationService;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.CannedResponseList;
import com.chototmua.crm.web.dto.ConversationDetailResponse;
import com.chototmua.crm.web.dto.ConversationListResponse;
import com.chototmua.crm.web.dto.CreateConversationRequest;
import com.chototmua.crm.web.dto.CsatRequest;
import com.chototmua.crm.web.dto.EscalateConversationRequest;
import com.chototmua.crm.web.dto.PatchConversationRequest;
import com.chototmua.crm.web.dto.PostMessageRequest;
import com.chototmua.crm.web.dto.PresenceRequest;
import com.chototmua.crm.web.dto.PresenceResponse;
import com.chototmua.crm.web.dto.SupportAgentResponse;
import com.chototmua.crm.web.dto.TypingRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST hội thoại. Khách tạo và nhắn; CSKH / CRM / Admin xử lý, gán và escalate.
 * Không WebSocket — khách và agent làm mới bằng cách gọi lại GET.
 */
@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversations;
    private final CurrentActor currentActor;

    public ConversationController(ConversationService conversations, CurrentActor currentActor) {
        this.conversations = conversations;
        this.currentActor = currentActor;
    }

    @GetMapping
    public ConversationListResponse list(@RequestParam(required = false) String filter) {
        return conversations.list(currentActor.requireUserId(), filter);
    }

    @GetMapping("/presence")
    public PresenceResponse readPresence() {
        return conversations.presence(currentActor.requireUserId(), null);
    }

    @PostMapping("/presence")
    public PresenceResponse writePresence(@RequestBody(required = false) PresenceRequest request) {
        Boolean online = request == null ? null : request.online();
        return conversations.presence(currentActor.requireUserId(), online);
    }

    @GetMapping("/agents")
    public List<SupportAgentResponse> agents() {
        return conversations.agents(currentActor.requireUserId());
    }

    @GetMapping("/canned")
    public CannedResponseList canned() {
        return conversations.canned(currentActor.requireUserId());
    }

    @PostMapping
    public ResponseEntity<ConversationDetailResponse> open(@RequestBody(required = false) CreateConversationRequest request) {
        CreateConversationRequest body = request == null
                ? new CreateConversationRequest(null, null, null, null)
                : request;
        ConversationDetailResponse created = conversations.open(
                currentActor.requireUserId(),
                body.type(),
                body.orderId(),
                body.topic(),
                body.content());
        return ResponseEntity.created(ResourceLocation.of("/api/conversations/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public ConversationDetailResponse detail(@PathVariable UUID id) {
        return conversations.detail(currentActor.requireUserId(), id);
    }

    @PatchMapping("/{id}")
    public ConversationDetailResponse patch(@PathVariable UUID id, @RequestBody PatchConversationRequest request) {
        return conversations.patch(
                currentActor.requireUserId(),
                id,
                request.status(),
                request.priority(),
                request.type());
    }

    @PostMapping("/{id}/messages")
    public ConversationDetailResponse message(@PathVariable UUID id, @RequestBody PostMessageRequest request) {
        return conversations.postMessage(
                currentActor.requireUserId(),
                id,
                request.kind(),
                request.content());
    }

    @PostMapping("/{id}/live")
    public ConversationDetailResponse live(@PathVariable UUID id) {
        return conversations.convertToLive(currentActor.requireUserId(), id);
    }

    @PostMapping("/{id}/escalate")
    public ConversationDetailResponse escalate(@PathVariable UUID id, @RequestBody EscalateConversationRequest request) {
        return conversations.escalate(currentActor.requireUserId(), id, request.employeeId());
    }

    @PostMapping("/{id}/csat")
    public ConversationDetailResponse csat(@PathVariable UUID id, @RequestBody CsatRequest request) {
        return conversations.csat(currentActor.requireUserId(), id, request.score());
    }

    @PostMapping("/{id}/typing")
    public ResponseEntity<Void> typing(@PathVariable UUID id, @RequestBody(required = false) TypingRequest request) {
        boolean typing = request != null && Boolean.TRUE.equals(request.typing());
        conversations.typing(currentActor.requireUserId(), id, typing);
        return ResponseEntity.noContent().build();
    }
}
