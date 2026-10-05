package com.chototmua.crm.application.conversation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Cột {@code conversation_messages.content} không có chỗ cho loại tin.
 * Tin thường lưu nguyên văn (tương thích dữ liệu đã gieo).
 * Tin nội bộ, bot, hệ thống và CSAT lưu JSON {@code {"kind","text","score"}}.
 */
public final class ConversationMessageText {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** Tiện ích tĩnh — không tạo đối tượng. */
    private ConversationMessageText() {
    }

    /** Tin công khai lưu nguyên văn; loại khác đóng JSON {@code kind}/{@code text}/{@code score}. */
    public static String encode(String kind, String text, Integer score) {
        if (kind == null || kind.isBlank() || ConversationText.KIND_PUBLIC.equals(kind)) {
            return text == null ? "" : text;
        }
        try {
            return JSON.writeValueAsString(new Payload(kind, text, score));
        } catch (Exception exception) {
            throw new IllegalStateException("Không mã hóa được nội dung hội thoại.", exception);
        }
    }

    /** Đọc JSON hoặc coi toàn bộ là tin công khai nếu không phải payload. */
    public static Decoded decode(String stored) {
        if (stored == null || !stored.startsWith("{") || !stored.contains("\"kind\"")) {
            return new Decoded(ConversationText.KIND_PUBLIC, stored == null ? "" : stored, null);
        }
        try {
            Payload payload = JSON.readValue(stored, Payload.class);
            String kind = payload.kind() == null ? ConversationText.KIND_PUBLIC : payload.kind();
            String text = payload.text() == null ? "" : payload.text();
            return new Decoded(kind, text, payload.score());
        } catch (Exception exception) {
            return new Decoded(ConversationText.KIND_PUBLIC, stored, null);
        }
    }

    /** Loại tin, nội dung hiển thị, điểm CSAT (nếu có). */
    public record Decoded(String kind, String text, Integer score) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Payload(String kind, String text, Integer score) {
    }
}
