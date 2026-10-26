package com.chototmua.crm.application.conversation;

/**
 * Cột {@code conversations.channel} giữ kênh liên hệ.
 * Chủ đề (khiếu nại, bảo hành, …) gắn sau dấu {@code |} vì schema không có cột topic.
 * Giá trị cũ {@code web} vẫn đọc được.
 */
public final class ConversationChannelText {

    /** Tiện ích tĩnh — không tạo đối tượng. */
    private ConversationChannelText() {
    }

    /** Ghi {@code channel|topic} vào một cột schema. */
    public static String encode(String channel, String topic) {
        // Nếu channel là null hoặc blank, trả về "web"
        String base = channel == null || channel.isBlank() ? "web" : channel;
        // Nếu topic là null hoặc blank, trả về base
        if (topic == null || topic.isBlank()) {
            return base;
        }
        // Trả về base và topic
        return base + "|" + topic;
    }

    /** Tách kênh và chủ đề; giá trị cũ không có {@code |} thì topic {@code null}. */
    public static Decoded decode(String stored) {
        // Nếu stored là null hoặc blank, trả về "web" và null
        if (stored == null || stored.isBlank()) {
            return new Decoded("web", null);
        }
        // Tìm vị trí của dấu | trong stored
        int bar = stored.indexOf('|');
        // Nếu không tìm thấy dấu |, trả về stored và null
        if (bar < 0) {
            return new Decoded(stored, null);
        }
        // Lấy topic từ vị trí sau dấu |
        String topic = stored.substring(bar + 1);
        // Nếu topic là null hoặc blank, trả về stored và null
        return new Decoded(stored.substring(0, bar), topic.isBlank() ? null : topic);
    }

    /** Kết quả giải mã cột channel. */
    public record Decoded(String channel, String topic) {
    }
}
