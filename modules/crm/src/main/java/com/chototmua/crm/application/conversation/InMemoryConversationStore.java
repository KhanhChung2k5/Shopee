package com.chototmua.crm.application.conversation;

import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Kho hội thoại trong bộ nhớ. Bài kiểm tra gọi {@link #clear()} giữa các ca. */
@Component
@Profile("crm-fake")
public class InMemoryConversationStore implements ConversationStore {

    private final Map<UUID, Conversation> conversations = new LinkedHashMap<>();
    private final Map<UUID, List<ConversationMessage>> messages = new LinkedHashMap<>();
    private final Map<UUID, List<AgentAssignment>> assignments = new LinkedHashMap<>();

    /** Xóa hội thoại, tin và lượt gán — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        conversations.clear();
        messages.clear();
        assignments.clear();
    }

    @Override
    public synchronized void save(Conversation conversation) {
        conversations.put(conversation.id(), conversation);
    }

    @Override
    public synchronized Optional<Conversation> find(UUID id) {
        return Optional.ofNullable(conversations.get(id));
    }

    @Override
    public synchronized List<Conversation> listAll() {
        return List.copyOf(conversations.values());
    }

    @Override
    public synchronized void appendMessage(ConversationMessage message) {
        messages.computeIfAbsent(message.conversationId(), ignored -> new ArrayList<>()).add(message);
    }

    @Override
    public synchronized List<ConversationMessage> messagesOf(UUID conversationId) {
        return messages.getOrDefault(conversationId, List.of()).stream()
                .sorted(Comparator.comparing(ConversationMessage::sentAt))
                .toList();
    }

    @Override
    public synchronized List<AgentAssignment> assignmentsOf(UUID conversationId) {
        return assignments.getOrDefault(conversationId, List.of()).stream()
                .sorted(Comparator.comparing(AgentAssignment::assignedAt))
                .toList();
    }

    @Override
    public synchronized void replaceCurrentAssignment(UUID conversationId, AgentAssignment next) {
        List<AgentAssignment> rows = new ArrayList<>();
        for (AgentAssignment row : assignments.getOrDefault(conversationId, List.of())) {
            rows.add(new AgentAssignment(
                    row.id(),
                    row.conversationId(),
                    row.employeeUserId(),
                    false,
                    row.assignedAt()));
        }
        rows.add(next);
        assignments.put(conversationId, rows);
    }
}
