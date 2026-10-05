package com.chototmua.crm.application.conversation;

import com.chototmua.crm.application.exception.ConversationNotFoundException;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidConversationException;
import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.web.dto.CannedResponseList;
import com.chototmua.crm.web.dto.ConversationDetailResponse;
import com.chototmua.crm.web.dto.ConversationListResponse;
import com.chototmua.crm.web.dto.ConversationSummaryResponse;
import com.chototmua.crm.web.dto.PresenceResponse;
import com.chototmua.crm.web.dto.SupportAgentResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Hội thoại ticket và live chat trên một model {@link Conversation}.
 * Khách không chọn chế độ: agent đang trực thì widget ở live, không thì ticket.
 */
@Service
public class ConversationService {

    private final IdentityPort identity;
    private final OrderPort orders;
    private final ConversationStore store;
    private final AgentPresence presence;
    private final SupportDirectory directory;
    private final ConversationPresenter presenter;

    /** Tiêm cổng danh tính/đơn hàng, kho hội thoại, hiện diện agent và lớp dựng JSON. */
    public ConversationService(
            IdentityPort identity,
            OrderPort orders,
            ConversationStore store,
            AgentPresence presence,
            SupportDirectory directory,
            ConversationPresenter presenter
    ) {
        this.identity = identity;
        this.orders = orders;
        this.store = store;
        this.presence = presence;
        this.directory = directory;
        this.presenter = presenter;
    }

    /**
     * Khách mở hội thoại. Không truyền loại thì live nếu có agent trực, không thì ticket.
     * Ticket khi không live kèm tin bot chào.
     */
    public ConversationDetailResponse open(UUID actorId, String requestedType, UUID orderId, String topic, String content) {
        CustomerView customer = requireActiveCustomer(actorId);
        String type = resolveType(requestedType);
        if (orderId != null && !orders.existsOrder(customer.id(), orderId)) {
            throw new InvalidConversationException("Không tìm thấy đơn hàng của khách này.");
        }
        String resolvedTopic = resolveTopic(topic, type);
        Instant now = Instant.now();
        Conversation conversation = new Conversation(
                UUID.randomUUID(),
                customer.id(),
                orderId,
                type,
                "web",
                resolvedTopic,
                ConversationText.TYPE_CHAT.equals(type)
                        ? ConversationText.STATUS_IN_PROGRESS
                        : ConversationText.STATUS_OPEN,
                ConversationText.PRIORITY_NORMAL,
                now,
                now);
        store.save(conversation);
        if (content != null && !content.isBlank()) {
            conversation = append(conversation, actorId, ConversationText.KIND_PUBLIC, content.trim(), null, now);
        }
        if (ConversationText.TYPE_TICKET.equals(type) && !presence.isLive()) {
            conversation = append(
                    conversation,
                    actorId,
                    ConversationText.KIND_BOT,
                    ConversationText.BOT_GREETING,
                    null,
                    now.plusMillis(1));
        }
        return presenter.detail(conversation, actorId, false);
    }

    /**
     * Nhân viên: hàng đợi toàn hệ thống (lọc {@code mine}/{@code open}/{@code high}).
     * Khách: chỉ hội thoại của mình.
     */
    public ConversationListResponse list(UUID actorId, String filter) {
        if (isStaff(actorId)) {
            List<ConversationSummaryResponse> items = new ArrayList<>();
            for (Conversation conversation : store.listAll()) {
                ConversationSummaryResponse summary = presenter.summary(conversation, actorId);
                if (matches(summary, filter)) {
                    items.add(summary);
                }
            }
            return new ConversationListResponse(sortedByUrgency(items), presence.isLive());
        }
        requireCustomer(actorId);
        List<ConversationSummaryResponse> items = new ArrayList<>();
        for (Conversation conversation : store.listAll()) {
            if (conversation.userId().equals(actorId)) {
                items.add(presenter.summary(conversation, actorId));
            }
        }
        return new ConversationListResponse(sortedByUrgency(items), presence.isLive());
    }

    /** Chi tiết một hội thoại. Khách không thấy hội thoại của người khác (404). */
    public ConversationDetailResponse detail(UUID actorId, UUID conversationId) {
        Conversation conversation = require(conversationId);
        if (isStaff(actorId)) {
            return presenter.detail(conversation, actorId, true);
        }
        if (conversation.userId().equals(actorId)) {
            return presenter.detail(conversation, actorId, false);
        }
        throw new ConversationNotFoundException(conversationId);
    }

    /** Nhân viên đổi loại, trạng thái hoặc mức ưu tiên. */
    public ConversationDetailResponse patch(UUID actorId, UUID conversationId, String status, String priority, String type) {
        requireStaff(actorId);
        Conversation conversation = require(conversationId);
        if (status != null && !status.isBlank() && !ConversationText.knownStatus(status)) {
            throw new InvalidConversationException("Trạng thái hội thoại không hợp lệ.");
        }
        if (priority != null && !priority.isBlank() && !ConversationText.knownPriority(priority)) {
            throw new InvalidConversationException("Mức ưu tiên không hợp lệ.");
        }
        if (type != null && !type.isBlank() && !ConversationText.knownType(type)) {
            throw new InvalidConversationException("Loại hội thoại chỉ là chat hoặc ticket.");
        }
        Conversation updated = conversation.updated(blankToNull(type), blankToNull(status), blankToNull(priority));
        store.save(updated);
        return presenter.detail(updated, actorId, true);
    }

    /**
     * Gửi tin công khai hoặc ghi chú nội bộ.
     * Tin công khai của nhân viên gán người xử lý và chuyển trạng thái sang đang xử lý.
     */
    public ConversationDetailResponse postMessage(UUID actorId, UUID conversationId, String kind, String content) {
        Conversation conversation = require(conversationId);
        String resolvedKind = kind == null || kind.isBlank() ? ConversationText.KIND_PUBLIC : kind;
        if (!ConversationText.KIND_PUBLIC.equals(resolvedKind) && !ConversationText.KIND_INTERNAL.equals(resolvedKind)) {
            throw new InvalidConversationException("Chỉ gửi được tin công khai hoặc ghi chú nội bộ.");
        }
        String text = requireContent(content);
        boolean staff = isStaff(actorId);
        if (!staff) {
            if (!conversation.userId().equals(actorId)) {
                throw new ConversationNotFoundException(conversationId);
            }
            if (ConversationText.KIND_INTERNAL.equals(resolvedKind)) {
                throw new CrmForbiddenException("Khách hàng không gửi được ghi chú nội bộ.");
            }
            if (ConversationText.STATUS_CLOSED.equals(conversation.status())) {
                throw new InvalidConversationException("Hội thoại đã đóng. Hãy mở yêu cầu mới nếu vẫn cần hỗ trợ.");
            }
        } else if (ConversationText.STATUS_CLOSED.equals(conversation.status())
                && ConversationText.KIND_PUBLIC.equals(resolvedKind)) {
            throw new InvalidConversationException("Hội thoại đã đóng. Chỉ còn ghi chú nội bộ.");
        }
        Instant now = Instant.now();
        conversation = append(conversation, actorId, resolvedKind, text, null, now);
        if (staff && ConversationText.KIND_PUBLIC.equals(resolvedKind)) {
            if (ConversationText.STATUS_OPEN.equals(conversation.status())) {
                conversation = conversation.updated(null, ConversationText.STATUS_IN_PROGRESS, null);
                store.save(conversation);
            }
            ensureAssigned(conversation.id(), actorId, now);
        }
        return presenter.detail(conversation, actorId, staff);
    }

    /** Đổi ticket sang live chat, gán agent hiện tại và ghi tin hệ thống chuyển tiếp. */
    public ConversationDetailResponse convertToLive(UUID actorId, UUID conversationId) {
        requireStaff(actorId);
        Conversation conversation = require(conversationId);
        if (ConversationText.STATUS_CLOSED.equals(conversation.status())) {
            throw new InvalidConversationException("Hội thoại đã đóng, không chuyển live chat.");
        }
        if (ConversationText.TYPE_CHAT.equals(conversation.type())) {
            throw new InvalidConversationException("Hội thoại đã là live chat.");
        }
        Instant now = Instant.now();
        conversation = conversation.updated(ConversationText.TYPE_CHAT, ConversationText.STATUS_IN_PROGRESS, null);
        store.save(conversation);
        ensureAssigned(conversation.id(), actorId, now);
        if (!hasHandoff(conversation.id())) {
            conversation = append(conversation, actorId, ConversationText.KIND_SYSTEM, ConversationText.HANDOFF, null, now);
        }
        return presenter.detail(conversation, actorId, true);
    }

    /** Chuyển hội thoại sang nhân viên khác; ghi chú nội bộ, không xóa lịch sử gán. */
    public ConversationDetailResponse escalate(UUID actorId, UUID conversationId, UUID targetUserId) {
        requireStaff(actorId);
        if (targetUserId == null) {
            throw new InvalidConversationException("Chọn nhân viên nhận chuyển tiếp.");
        }
        identity.requireCrmStaff(targetUserId);
        Conversation conversation = require(conversationId);
        AgentAssignment current = currentAssignment(conversation.id());
        if (current != null && current.employeeUserId().equals(targetUserId)) {
            throw new InvalidConversationException("Nhân viên này đang phụ trách hội thoại.");
        }
        Instant now = Instant.now();
        store.replaceCurrentAssignment(conversation.id(), new AgentAssignment(
                UUID.randomUUID(),
                conversation.id(),
                targetUserId,
                true,
                now));
        String note = "Đã chuyển cho " + staffName(targetUserId) + ".";
        conversation = append(conversation, actorId, ConversationText.KIND_INTERNAL, note, null, now);
        return presenter.detail(conversation, actorId, true);
    }

    /** Khách chấm CSAT 1–5 sau khi hội thoại đóng; mỗi hội thoại một lần. */
    public ConversationDetailResponse csat(UUID actorId, UUID conversationId, Integer score) {
        CustomerView customer = requireActiveCustomer(actorId);
        Conversation conversation = require(conversationId);
        if (!conversation.userId().equals(customer.id())) {
            throw new ConversationNotFoundException(conversationId);
        }
        if (!ConversationText.STATUS_CLOSED.equals(conversation.status())) {
            throw new InvalidConversationException("Chỉ đánh giá sau khi yêu cầu đã được giải quyết.");
        }
        if (score == null || score < 1 || score > 5) {
            throw new InvalidConversationException("Điểm hài lòng từ 1 đến 5.");
        }
        if (csatScore(conversation.id()) != null) {
            throw new InvalidConversationException("Bạn đã gửi đánh giá cho hội thoại này.");
        }
        conversation = append(
                conversation,
                actorId,
                ConversationText.KIND_CSAT,
                "Đánh giá " + score + "/5",
                score,
                Instant.now());
        return presenter.detail(conversation, actorId, false);
    }

    /** Nhân viên bật/tắt trực; trả về bàn đang live hay không (widget khách đọc chip). */
    public PresenceResponse presence(UUID actorId, Boolean online) {
        if (online != null) {
            requireStaff(actorId);
            if (online) {
                presence.beat(actorId);
            } else {
                presence.offline(actorId);
            }
        }
        return new PresenceResponse(presence.isLive());
    }

    /** Đánh dấu đang nhập trong hội thoại; nhân viên đồng thời gia hạn nhịp trực. */
    public void typing(UUID actorId, UUID conversationId, boolean typing) {
        Conversation conversation = require(conversationId);
        boolean staff = isStaff(actorId);
        if (!staff && !conversation.userId().equals(actorId)) {
            throw new ConversationNotFoundException(conversationId);
        }
        if (staff) {
            presence.beat(actorId);
        }
        presence.typing(conversationId, actorId, typing);
    }

    /** Danh sách nhân viên hỗ trợ để chuyển tiếp. */
    public List<SupportAgentResponse> agents(UUID actorId) {
        requireStaff(actorId);
        List<SupportAgentResponse> agents = new ArrayList<>();
        for (SupportDirectory.SupportAgent agent : directory.listAgents()) {
            agents.add(new SupportAgentResponse(
                    agent.userId(),
                    agent.fullName(),
                    agent.department(),
                    ConversationText.roleLabel(agent.department())));
        }
        return agents;
    }

    /** Câu trả lời mẫu cho bàn CSKH. */
    public CannedResponseList canned(UUID actorId) {
        requireStaff(actorId);
        return new CannedResponseList(ConversationText.CANNED);
    }

    /** Ghi một tin và cập nhật mốc tin cuối. */
    private Conversation append(
            Conversation conversation,
            UUID senderId,
            String kind,
            String content,
            Integer score,
            Instant when
    ) {
        store.appendMessage(new ConversationMessage(
                UUID.randomUUID(),
                conversation.id(),
                senderId,
                kind,
                content,
                score,
                when));
        Conversation touched = conversation.withLastMessageAt(when);
        store.save(touched);
        return touched;
    }

    /** Gán nhân viên hiện tại nếu hội thoại chưa có người phụ trách. */
    private void ensureAssigned(UUID conversationId, UUID actorId, Instant when) {
        if (currentAssignment(conversationId) != null) {
            return;
        }
        store.replaceCurrentAssignment(conversationId, new AgentAssignment(
                UUID.randomUUID(),
                conversationId,
                actorId,
                true,
                when));
    }

    /** Lượt gán đang {@code current=true}, hoặc {@code null}. */
    private AgentAssignment currentAssignment(UUID conversationId) {
        List<AgentAssignment> rows = store.assignmentsOf(conversationId);
        for (int index = rows.size() - 1; index >= 0; index--) {
            if (rows.get(index).current()) {
                return rows.get(index);
            }
        }
        return null;
    }

    /** Đã có tin hệ thống chuyển live chưa (tránh ghi hai lần). */
    private boolean hasHandoff(UUID conversationId) {
        for (ConversationMessage message : store.messagesOf(conversationId)) {
            if (ConversationText.KIND_SYSTEM.equals(message.kind())
                    && ConversationText.HANDOFF.equals(message.content())) {
                return true;
            }
        }
        return false;
    }

    /** Điểm CSAT đã nộp, hoặc {@code null}. */
    private Integer csatScore(UUID conversationId) {
        for (ConversationMessage message : store.messagesOf(conversationId)) {
            if (ConversationText.KIND_CSAT.equals(message.kind())) {
                return message.score();
            }
        }
        return null;
    }

    /** Chuẩn hóa loại: trống thì theo {@link AgentPresence#isLive()}. */
    private String resolveType(String requestedType) {
        if (requestedType == null || requestedType.isBlank()) {
            return presence.isLive() ? ConversationText.TYPE_CHAT : ConversationText.TYPE_TICKET;
        }
        if (!ConversationText.knownType(requestedType)) {
            throw new InvalidConversationException("Loại hội thoại chỉ là chat hoặc ticket.");
        }
        return requestedType;
    }

    /** Chủ đề mặc định: chat → tư vấn, ticket → khiếu nại. */
    private String resolveTopic(String topic, String type) {
        if (topic == null || topic.isBlank()) {
            return ConversationText.TYPE_CHAT.equals(type) ? "tu_van" : "khieu_nai";
        }
        if (!ConversationText.knownTopic(topic)) {
            throw new InvalidConversationException("Chủ đề hội thoại không hợp lệ.");
        }
        return topic;
    }

    /** Cắt khoảng trắng; tối đa 2000 ký tự. */
    private static String requireContent(String content) {
        if (content == null || content.isBlank()) {
            throw new InvalidConversationException("Nội dung tin nhắn không được để trống.");
        }
        String trimmed = content.trim();
        if (trimmed.length() > 2000) {
            throw new InvalidConversationException("Nội dung tin nhắn tối đa 2000 ký tự.");
        }
        return trimmed;
    }

    /** Lọc hàng đợi nhân viên: {@code all}, {@code mine}, {@code open}, {@code high}. */
    private static boolean matches(ConversationSummaryResponse summary, String filter) {
        if (filter == null || filter.isBlank() || "all".equals(filter)) {
            return true;
        }
        return switch (filter) {
            case "mine" -> summary.mine();
            case "open" -> ConversationText.STATUS_OPEN.equals(summary.status())
                    || ConversationText.STATUS_IN_PROGRESS.equals(summary.status());
            case "high" -> ConversationText.PRIORITY_HIGH.equals(summary.priority());
            default -> throw new InvalidConversationException("Bộ lọc chỉ nhận mine, open hoặc high.");
        };
    }

    /** Hàng đợi: quá hạn trước → sắp hết hạn → còn hạn → đã đóng; trong nhóm theo mức vượt hạn / ưu tiên. */
    private static List<ConversationSummaryResponse> sortedByUrgency(List<ConversationSummaryResponse> items) {
        return items.stream()
                .sorted(Comparator
                        .comparingInt((ConversationSummaryResponse item) -> slaRank(item.slaState()))
                        .thenComparing(item -> item.slaDueAt() == null ? Instant.MAX : item.slaDueAt())
                        .thenComparingInt(item -> priorityRank(item.priority()))
                        .thenComparing(item -> item.lastMessageAt() == null ? Instant.EPOCH : item.lastMessageAt(),
                                Comparator.reverseOrder()))
                .toList();
    }

    /** Thứ tự SLA: quá hạn trước, rồi sắp hết hạn, còn hạn, đã đóng. */
    private static int slaRank(String slaState) {
        if (slaState == null) {
            return 3;
        }
        return switch (slaState) {
            case "breached" -> 0;
            case "due" -> 1;
            case "ok" -> 2;
            default -> 3;
        };
    }

    /** Ưu tiên cao trước trong cùng nhóm SLA. */
    private static int priorityRank(String priority) {
        if (ConversationText.PRIORITY_HIGH.equals(priority)) {
            return 0;
        }
        if (ConversationText.PRIORITY_NORMAL.equals(priority)) {
            return 1;
        }
        return 2;
    }

    /** Hội thoại tồn tại hoặc 404. */
    private Conversation require(UUID conversationId) {
        return store.find(conversationId).orElseThrow(() -> new ConversationNotFoundException(conversationId));
    }

    /** Khách đang hoạt động; tài khoản khóa/xóa không mở hội thoại. */
    private CustomerView requireActiveCustomer(UUID actorId) {
        CustomerView customer = requireCustomer(actorId);
        if (CustomerStatus.LOCKED.equals(customer.status()) || CustomerStatus.DELETED.equals(customer.status())) {
            throw new InvalidConversationException("Tài khoản đã khóa hoặc đã xóa không thể mở hội thoại.");
        }
        return customer;
    }

    /** Diễn viên phải là khách trên cổng danh tính; không thì 403. */
    private CustomerView requireCustomer(UUID actorId) {
        try {
            return identity.getCustomer(actorId);
        } catch (CustomerNotFoundException exception) {
            throw new CrmForbiddenException("Bạn không có quyền thực hiện thao tác này.");
        }
    }

    /** Chỉ nhân viên CRM / CSKH / admin. */
    private void requireStaff(UUID actorId) {
        identity.requireCrmStaff(actorId);
    }

    /** {@code true} nếu diễn viên thuộc phòng CRM/CSKH/admin. */
    private boolean isStaff(UUID actorId) {
        try {
            identity.requireCrmStaff(actorId);
            return true;
        } catch (CrmForbiddenException exception) {
            return false;
        }
    }

    /** Tên nhân viên từ danh bạ; thiếu thì “nhân viên hỗ trợ”. */
    private String staffName(UUID userId) {
        String name = directory.nameOf(userId);
        return name == null || name.isBlank() ? "nhân viên hỗ trợ" : name;
    }

    /** Chuỗi trống → {@code null} để {@code updated} giữ giá trị cũ. */
    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
