package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.conversation.ConversationChannelText;
import com.chototmua.crm.application.conversation.ConversationMessageText;
import com.chototmua.crm.application.conversation.ConversationStore;
import com.chototmua.crm.application.exception.InvalidConversationException;
import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Hội thoại trên {@code conversations} / {@code conversation_messages} / {@code agent_assignments}.
 * Không tạo bảng mới. Chủ đề nằm trong {@code channel}; loại tin nằm trong {@code content}.
 */
@Component
@Profile("crm-db")
public class JdbcConversationStore implements ConversationStore {

    private final JdbcTemplate jdbc;

    public JdbcConversationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void save(Conversation conversation) {
        jdbc.update("""
                INSERT INTO conversations (
                    id, user_id, order_id, type, channel, status, priority, last_message_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    order_id = EXCLUDED.order_id,
                    type = EXCLUDED.type,
                    channel = EXCLUDED.channel,
                    status = EXCLUDED.status,
                    priority = EXCLUDED.priority,
                    last_message_at = EXCLUDED.last_message_at
                """,
                conversation.id(),
                conversation.userId(),
                conversation.orderId(),
                conversation.type(),
                ConversationChannelText.encode(conversation.channel(), conversation.topic()),
                conversation.status(),
                conversation.priority(),
                timestamp(conversation.lastMessageAt()));
    }

    @Override
    public Optional<Conversation> find(UUID id) {
        List<Conversation> rows = jdbc.query(selectSql() + " WHERE c.id = ?", this::mapConversation, id);
        return rows.stream().findFirst();
    }

    @Override
    public List<Conversation> listAll() {
        return jdbc.query(selectSql() + " ORDER BY c.last_message_at DESC NULLS LAST", this::mapConversation);
    }

    @Override
    public void appendMessage(ConversationMessage message) {
        jdbc.update("""
                INSERT INTO conversation_messages (id, conversation_id, sender_id, content, sent_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                message.id(),
                message.conversationId(),
                message.senderId(),
                ConversationMessageText.encode(message.kind(), message.content(), message.score()),
                timestamp(message.sentAt()));
    }

    @Override
    public List<ConversationMessage> messagesOf(UUID conversationId) {
        return jdbc.query("""
                SELECT id, conversation_id, sender_id, content, sent_at
                FROM conversation_messages
                WHERE conversation_id = ?
                ORDER BY sent_at
                """, (rs, rowNum) -> {
            ConversationMessageText.Decoded decoded = ConversationMessageText.decode(rs.getString("content"));
            return new ConversationMessage(
                    rs.getObject("id", UUID.class),
                    rs.getObject("conversation_id", UUID.class),
                    rs.getObject("sender_id", UUID.class),
                    decoded.kind(),
                    decoded.text(),
                    decoded.score(),
                    instant(rs.getTimestamp("sent_at")));
        }, conversationId);
    }

    @Override
    public List<AgentAssignment> assignmentsOf(UUID conversationId) {
        return jdbc.query("""
                SELECT a.id, a.conversation_id, e.user_id, a.is_current, a.assigned_at
                FROM agent_assignments a
                JOIN employees e ON e.id = a.employee_id
                WHERE a.conversation_id = ?
                ORDER BY a.assigned_at
                """, (rs, rowNum) -> new AgentAssignment(
                rs.getObject("id", UUID.class),
                rs.getObject("conversation_id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getBoolean("is_current"),
                instant(rs.getTimestamp("assigned_at"))), conversationId);
    }

    @Override
    @Transactional
    public void replaceCurrentAssignment(UUID conversationId, AgentAssignment next) {
        jdbc.update(
                "UPDATE agent_assignments SET is_current = false WHERE conversation_id = ?",
                conversationId);
        jdbc.update("""
                INSERT INTO agent_assignments (id, conversation_id, employee_id, is_current, assigned_at)
                VALUES (?, ?, ?, true, ?)
                """,
                next.id(),
                conversationId,
                employeeId(next.employeeUserId()),
                timestamp(next.assignedAt()));
    }

    private Conversation mapConversation(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        ConversationChannelText.Decoded channel = ConversationChannelText.decode(rs.getString("channel"));
        Instant opened = instant(rs.getTimestamp("opened_at"));
        Instant last = instant(rs.getTimestamp("last_message_at"));
        if (opened == null) {
            opened = last;
        }
        String type = rs.getString("type");
        String status = rs.getString("status");
        String priority = rs.getString("priority");
        return new Conversation(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getObject("order_id", UUID.class),
                type == null ? "chat" : type,
                channel.channel(),
                channel.topic(),
                status == null ? "open" : status,
                priority == null ? "normal" : priority,
                opened,
                last);
    }

    private static String selectSql() {
        return """
                SELECT c.id, c.user_id, c.order_id, c.type, c.channel, c.status, c.priority, c.last_message_at,
                       (SELECT MIN(m.sent_at) FROM conversation_messages m WHERE m.conversation_id = c.id) AS opened_at
                FROM conversations c
                """;
    }

    private UUID employeeId(UUID actorOrEmployee) {
        List<UUID> rows = jdbc.query("""
                SELECT id FROM employees
                WHERE id = ? OR user_id = ?
                """, (rs, rowNum) -> rs.getObject("id", UUID.class), actorOrEmployee, actorOrEmployee);
        if (rows.isEmpty()) {
            throw new InvalidConversationException("Không tìm thấy nhân viên để gán hội thoại.");
        }
        return rows.get(0);
    }

    private static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
