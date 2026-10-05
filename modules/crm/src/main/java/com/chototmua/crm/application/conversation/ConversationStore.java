package com.chototmua.crm.application.conversation;

import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;

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

    /** Tắt lượt đang xử lý rồi ghi một lượt mới {@code current=true}. Không xóa lịch sử. */
    void replaceCurrentAssignment(UUID conversationId, AgentAssignment next);
}
