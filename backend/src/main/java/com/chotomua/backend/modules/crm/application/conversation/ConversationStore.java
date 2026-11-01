package com.chotomua.backend.modules.crm.application.conversation;

import com.chotomua.backend.modules.crm.domain.conversation.AgentAssignment;
import com.chotomua.backend.modules.crm.domain.conversation.Conversation;
import com.chotomua.backend.modules.crm.domain.conversation.ConversationMessage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho hội thoại: bộ nhớ khi kiểm thử, bảng nhóm khi chạy PostgreSQL. Không thêm SQL mới. */
public interface ConversationStore {

    /** Ghi hoặc cập nhật hội thoại (không đụng tin nhắn). */
    void save(Conversation conversation);

    Optional<Conversation> find(UUID id);

    /** Mọi hội thoại — lớp dịch vụ tự lọc theo quyền. */
    List<Conversation> listAll();

    /** Thêm một tin vào luồng. */
    void appendMessage(ConversationMessage message);

    /** Tin theo thời gian gửi tăng dần. */
    List<ConversationMessage> messagesOf(UUID conversationId);

    /** Lịch sử gán agent, cũ trước. */
    List<AgentAssignment> assignmentsOf(UUID conversationId);

    /** Messages of many conversations at once (support queue). Default: one call each; the JDBC store batches. */
    default java.util.Map<UUID, List<ConversationMessage>> messagesOfAll(java.util.Collection<UUID> conversationIds) {
        java.util.Map<UUID, List<ConversationMessage>> result = new java.util.HashMap<>();
        conversationIds.forEach(id -> result.put(id, messagesOf(id)));
        return result;
    }

    /** Assignments of many conversations at once (support queue). Default: one call each; the JDBC store batches. */
    default java.util.Map<UUID, List<AgentAssignment>> assignmentsOfAll(java.util.Collection<UUID> conversationIds) {
        java.util.Map<UUID, List<AgentAssignment>> result = new java.util.HashMap<>();
        conversationIds.forEach(id -> result.put(id, assignmentsOf(id)));
        return result;
    }

    /** Tắt lượt đang xử lý rồi ghi một lượt mới {@code current=true}. Không xóa lịch sử. */
    void replaceCurrentAssignment(UUID conversationId, AgentAssignment next);
}
