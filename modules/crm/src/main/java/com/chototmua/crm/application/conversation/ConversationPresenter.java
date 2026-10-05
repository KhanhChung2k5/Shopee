package com.chototmua.crm.application.conversation;

import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.profile.ProfileStore;
import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;
import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.web.dto.AssignmentResponse;
import com.chototmua.crm.web.dto.ConversationCustomerResponse;
import com.chototmua.crm.web.dto.ConversationDetailResponse;
import com.chototmua.crm.web.dto.ConversationHistoryItem;
import com.chototmua.crm.web.dto.ConversationMessageResponse;
import com.chototmua.crm.web.dto.ConversationSummaryResponse;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Dựng JSON bàn CSKH và widget khách từ hội thoại đã lưu. */
@Component
public class ConversationPresenter {

    private final IdentityPort identity;
    private final ProfileStore profiles;
    private final OrderPort orders;
    private final SupportDirectory directory;
    private final ConversationStore store;
    private final AgentPresence presence;

    public ConversationPresenter(
            IdentityPort identity,
            ProfileStore profiles,
            OrderPort orders,
            SupportDirectory directory,
            ConversationStore store,
            AgentPresence presence
    ) {
        this.identity = identity;
        this.profiles = profiles;
        this.orders = orders;
        this.directory = directory;
        this.store = store;
        this.presence = presence;
    }

    /** Dòng hàng đợi: mã ticket, SLA, người đang phụ trách, cờ {@code mine}. */
    public ConversationSummaryResponse summary(Conversation conversation, UUID viewerId) {
        List<ConversationMessage> messages = store.messagesOf(conversation.id());
        List<AgentAssignment> assignments = store.assignmentsOf(conversation.id());
        AgentAssignment current = currentOf(assignments);
        Instant now = Instant.now();
        return new ConversationSummaryResponse(
                conversation.id(),
                ConversationText.code(conversation.id()),
                conversation.userId(),
                customerName(conversation.userId()),
                conversation.type(),
                ConversationText.channelLabel(conversation.type()),
                ConversationText.topicLabel(conversation.topic(), conversation.type()),
                conversation.status(),
                ConversationText.statusLabel(conversation.status()),
                conversation.priority(),
                preview(messages),
                conversation.lastMessageAt(),
                ConversationText.slaDueAt(conversation),
                ConversationText.slaState(conversation, now),
                current == null ? null : current.employeeUserId(),
                current == null ? null : staffName(current.employeeUserId()),
                current != null && current.employeeUserId().equals(viewerId));
    }

    /**
     * Chi tiết hội thoại. {@code staffView} thì gồm ghi chú nội bộ, lịch sử gán và panel khách.
     */
    public ConversationDetailResponse detail(Conversation conversation, UUID viewerId, boolean staffView) {
        List<ConversationMessage> messages = store.messagesOf(conversation.id());
        List<AgentAssignment> assignments = store.assignmentsOf(conversation.id());
        AgentAssignment current = currentOf(assignments);
        Instant now = Instant.now();
        boolean live = presence.isLive();
        UUID typer = presence.typingUser(conversation.id(), viewerId);
        return new ConversationDetailResponse(
                conversation.id(),
                ConversationText.code(conversation.id()),
                conversation.userId(),
                customerName(conversation.userId()),
                conversation.type(),
                ConversationText.channelLabel(conversation.type()),
                conversation.topic(),
                ConversationText.topicLabel(conversation.topic(), conversation.type()),
                conversation.status(),
                ConversationText.statusLabel(conversation.status()),
                conversation.priority(),
                conversation.orderId(),
                conversation.openedAt(),
                conversation.lastMessageAt(),
                ConversationText.slaDueAt(conversation),
                ConversationText.slaState(conversation, now),
                live,
                live ? "live" : "ticket",
                typer == null ? null : displayName(typer, conversation.userId()),
                csatScore(messages),
                current == null ? null : current.employeeUserId(),
                current == null ? null : staffName(current.employeeUserId()),
                messageViews(messages, conversation.userId(), staffView),
                staffView ? assignmentViews(assignments) : List.of(),
                staffView ? customerPanel(conversation) : null);
    }

    /** Panel CSKH: RFM, chi nhánh, đơn gần nhất, hội thoại khác của cùng khách. */
    private ConversationCustomerResponse customerPanel(Conversation conversation) {
        CustomerProfileCRM profile = profiles.find(conversation.userId()).orElse(null);
        List<DeliveredOrderView> delivered = orders.listDeliveredOrders(conversation.userId());
        if (delivered == null) {
            delivered = List.of();
        }
        DeliveredOrderView last = delivered.stream()
                .max(Comparator.comparing(order -> order.deliveredAt() == null ? Instant.EPOCH : order.deliveredAt()))
                .orElse(null);
        BigDecimal spend = profile == null || profile.ltv() == null ? BigDecimal.ZERO : profile.ltv();
        int totalOrders = profile == null ? delivered.size() : profile.totalOrders();
        String tier = profile == null ? null : profile.rfmSegment();
        List<ConversationHistoryItem> history = new ArrayList<>();
        for (Conversation other : store.listAll()) {
            if (!other.userId().equals(conversation.userId()) || other.id().equals(conversation.id())) {
                continue;
            }
            history.add(new ConversationHistoryItem(
                    other.id(),
                    ConversationText.code(other.id()),
                    other.status(),
                    ConversationText.statusLabel(other.status()),
                    ConversationText.topicLabel(other.topic(), other.type()),
                    ConversationText.channelLabel(other.type()),
                    other.lastMessageAt()));
        }
        history.sort(Comparator.comparing(
                (ConversationHistoryItem item) -> item.lastMessageAt() == null ? Instant.EPOCH : item.lastMessageAt())
                .reversed());
        return new ConversationCustomerResponse(
                conversation.userId(),
                customerName(conversation.userId()),
                tier,
                ConversationText.tierLabel(tier),
                directory.branchOf(conversation.userId()),
                spend,
                totalOrders,
                last == null ? null : last.orderId(),
                last == null ? null : last.totalAmount(),
                last == null ? null : last.deliveredAt(),
                history);
    }

    /** Khách không thấy tin {@code internal}. */
    private List<ConversationMessageResponse> messageViews(
            List<ConversationMessage> messages,
            UUID customerId,
            boolean staffView
    ) {
        List<ConversationMessageResponse> views = new ArrayList<>();
        for (ConversationMessage message : messages) {
            if (!staffView && ConversationText.KIND_INTERNAL.equals(message.kind())) {
                continue;
            }
            views.add(new ConversationMessageResponse(
                    message.id(),
                    message.senderId(),
                    senderName(message, customerId),
                    senderRole(message, customerId),
                    message.kind(),
                    message.content(),
                    message.score(),
                    message.sentAt(),
                    side(message, customerId)));
        }
        return views;
    }

    /** Lịch sử gán agent cho bàn CSKH. */
    private List<AssignmentResponse> assignmentViews(List<AgentAssignment> assignments) {
        List<AssignmentResponse> views = new ArrayList<>();
        for (AgentAssignment assignment : assignments) {
            views.add(new AssignmentResponse(
                    assignment.id(),
                    assignment.employeeUserId(),
                    staffName(assignment.employeeUserId()),
                    ConversationText.roleLabel(directory.departmentOf(assignment.employeeUserId())),
                    assignment.current(),
                    assignment.assignedAt()));
        }
        return views;
    }

    /** Lượt gán đang hiệu lực. */
    private static AgentAssignment currentOf(List<AgentAssignment> assignments) {
        for (int index = assignments.size() - 1; index >= 0; index--) {
            if (assignments.get(index).current()) {
                return assignments.get(index);
            }
        }
        return null;
    }

    /** Đoạn xem trước hàng đợi: tin công khai/bot/hệ thống gần nhất, cắt 80 ký tự. */
    private static String preview(List<ConversationMessage> messages) {
        for (int index = messages.size() - 1; index >= 0; index--) {
            ConversationMessage message = messages.get(index);
            if (ConversationText.KIND_INTERNAL.equals(message.kind())
                    || ConversationText.KIND_CSAT.equals(message.kind())) {
                continue;
            }
            String text = message.content() == null ? "" : message.content().trim();
            if (text.length() > 80) {
                return text.substring(0, 77) + "...";
            }
            return text;
        }
        return "";
    }

    /** Điểm CSAT mới nhất trên luồng tin. */
    private static Integer csatScore(List<ConversationMessage> messages) {
        for (int index = messages.size() - 1; index >= 0; index--) {
            ConversationMessage message = messages.get(index);
            if (ConversationText.KIND_CSAT.equals(message.kind())) {
                return message.score();
            }
        }
        return null;
    }

    /** Phía bong bóng chat: customer / agent / bot / system / note. */
    private String side(ConversationMessage message, UUID customerId) {
        if (ConversationText.KIND_INTERNAL.equals(message.kind())) {
            return "note";
        }
        if (ConversationText.KIND_SYSTEM.equals(message.kind()) || ConversationText.KIND_CSAT.equals(message.kind())) {
            return "system";
        }
        if (ConversationText.KIND_BOT.equals(message.kind())) {
            return "bot";
        }
        if (customerId.equals(message.senderId())) {
            return "customer";
        }
        return "agent";
    }

    /** Tên hiển thị người gửi. */
    private String senderName(ConversationMessage message, UUID customerId) {
        if (ConversationText.KIND_BOT.equals(message.kind())) {
            return "Trợ lý ảo";
        }
        if (ConversationText.KIND_SYSTEM.equals(message.kind())) {
            return "Hệ thống";
        }
        return displayName(message.senderId(), customerId);
    }

    /** Nhãn vai trò trên tin (Khách hàng, CSKH, …). */
    private String senderRole(ConversationMessage message, UUID customerId) {
        if (ConversationText.KIND_BOT.equals(message.kind())) {
            return "Trợ lý ảo";
        }
        if (ConversationText.KIND_SYSTEM.equals(message.kind())) {
            return "Hệ thống";
        }
        if (customerId.equals(message.senderId())) {
            return "Khách hàng";
        }
        return ConversationText.roleLabel(directory.departmentOf(message.senderId()));
    }

    /** Khách thì tên hồ sơ, còn lại tên nhân viên. */
    private String displayName(UUID userId, UUID customerId) {
        if (customerId.equals(userId)) {
            return customerName(customerId);
        }
        return staffName(userId);
    }

    /** Tên khách từ danh tính; mất hồ sơ thì “Khách hàng”. */
    private String customerName(UUID userId) {
        try {
            CustomerView customer = identity.getCustomer(userId);
            return customer.fullName() == null || customer.fullName().isBlank() ? "Khách hàng" : customer.fullName();
        } catch (CustomerNotFoundException exception) {
            return "Khách hàng";
        }
    }

    /** Tên nhân viên từ danh bạ. */
    private String staffName(UUID userId) {
        String name = directory.nameOf(userId);
        return name == null || name.isBlank() ? "Nhân viên hỗ trợ" : name;
    }
}
