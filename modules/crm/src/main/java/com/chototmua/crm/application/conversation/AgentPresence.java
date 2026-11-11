package com.chototmua.crm.application.conversation;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agent đang trực và đang nhập — chỉ trong bộ nhớ, không cần WebSocket.
 * Bàn CSKH gửi nhịp; khách đọc {@link #isLive()} để đổi chip trạng thái.
 */
@Component
public class AgentPresence {
    /** Thời gian để agent được coi là online */
    private static final Duration ONLINE_FOR = Duration.ofSeconds(45);
    /** Thời gian để agent được coi là typing */
    private static final Duration TYPING_FOR = Duration.ofSeconds(4);

    /** Map để lưu trữ nhịp của agent */
    private final Map<UUID, Instant> beats = new ConcurrentHashMap<>();
    /** Map để lưu trữ typing của agent */
    private final Map<UUID, Typing> typing = new ConcurrentHashMap<>();

    /** Gia hạn nhịp trực ~45 giây. */
    public void beat(UUID userId) {
        beats.put(userId, Instant.now());
    }

    /** Tắt trực ngay, không chờ hết hạn. */
    public void offline(UUID userId) {
        beats.remove(userId);
    }

    /** Có ít nhất một agent còn nhịp trong cửa sổ trực. */
    public boolean isLive() {
        // Lấy thời gian hiện tại và trừ đi thời gian online_for
        Instant cutoff = Instant.now().minus(ONLINE_FOR);
        // Xóa các entry có thời gian nhịp trước cutoff
        beats.entrySet().removeIf(entry -> entry.getValue().isBefore(cutoff));
        // Trả về true nếu có ít nhất một agent còn nhịp trong cửa sổ trực
        return !beats.isEmpty();
    }

    /** Bật/tắt trạng thái đang nhập; hết hạn sau ~4 giây. */
    public void typing(UUID conversationId, UUID userId, boolean active) {
        // Nếu không active, xóa entry typing của conversationId và userId
        if (!active) {
            Typing current = typing.get(conversationId);
            if (current != null && current.userId().equals(userId)) {
                typing.remove(conversationId);
            }
            return;
        }
        // Thêm entry typing của conversationId và userId với thời gian typing_for
        typing.put(conversationId, new Typing(userId, Instant.now().plus(TYPING_FOR)));
    }

    /** Người khác đang nhập, hoặc null nếu hết hạn / chính người xem. */
    public UUID typingUser(UUID conversationId, UUID viewerId) {
        // Lấy entry typing của conversationId
        Typing row = typing.get(conversationId);
        // Nếu entry typing không tồn tại hoặc hết hạn, xóa entry typing của conversationId
        if (row == null || Instant.now().isAfter(row.until())) {
            typing.remove(conversationId);
            return null;
        }
        // Nếu userId của entry typing bằng viewerId, trả về null
        if (row.userId().equals(viewerId)) {
            // Xóa entry typing của conversationId
            return null;
        }
        // Trả về userId của entry typing
        return row.userId();
    }

    /** Xóa nhịp và typing — dùng giữa các bài kiểm thử. */
    public void clear() {
        beats.clear();
        typing.clear();
    }

    /** Một phiên đang nhập: ai và hết hạn lúc nào. */
    private record Typing(UUID userId, Instant until) {
    }
}
