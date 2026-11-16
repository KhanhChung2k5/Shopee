package com.chototmua.crm.application.conversation;

import com.chototmua.crm.domain.conversation.Conversation;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Nhãn, mã ticket và đồng hồ SLA — không lưu thêm cột. */
public final class ConversationText {

    public static final String TYPE_CHAT = "chat";
    public static final String TYPE_TICKET = "ticket";
    public static final String STATUS_OPEN = "open";
    public static final String STATUS_IN_PROGRESS = "in_progress";
    public static final String STATUS_CLOSED = "closed";
    public static final String PRIORITY_LOW = "low";
    public static final String PRIORITY_NORMAL = "normal";
    public static final String PRIORITY_HIGH = "high";
    public static final String KIND_PUBLIC = "public";
    public static final String KIND_INTERNAL = "internal";
    public static final String KIND_BOT = "bot";
    public static final String KIND_SYSTEM = "system";
    public static final String KIND_CSAT = "csat";

    public static final String HANDOFF = "Đã chuyển cho nhân viên hỗ trợ";
    public static final String BOT_GREETING =
            "Chợ Tốt Mua đã nhận yêu cầu của bạn. Nhân viên CSKH sẽ phản hồi trong giờ làm việc.";

    public static final List<String> CANNED = List.of(
            "Chào anh/chị, em đã nhận khiếu nại và đang kiểm tra đơn giúp mình.",
            "Em rất tiếc về trải nghiệm này. Shop hỗ trợ đổi mới hoặc bảo hành theo chính sách.",
            "Anh/chị gửi giúp mã đơn hoặc ảnh sản phẩm để em xử lý nhanh hơn nhé.");

    private static final Set<String> TYPES = Set.of(TYPE_CHAT, TYPE_TICKET);
    private static final Set<String> STATUSES = Set.of(STATUS_OPEN, STATUS_IN_PROGRESS, STATUS_CLOSED);
    private static final Set<String> PRIORITIES = Set.of(PRIORITY_LOW, PRIORITY_NORMAL, PRIORITY_HIGH);
    private static final Set<String> TOPICS = Set.of("khieu_nai", "hoi_don", "bao_hanh", "tu_van", "khac");

    /** Tiện ích tĩnh — không tạo đối tượng. */
    private ConversationText() {
    }

    /** Mã ticket ngắn dạng {@code TK-} + 8 hex đầu của UUID. */
    public static String code(UUID id) {
        String compact = id.toString().replace("-", "");
        return "TK-" + compact.substring(0, 8).toUpperCase(Locale.ROOT);
    }

    /** Nhãn kênh UI: Live chat hoặc Ticket. */
    public static String channelLabel(String type) {
        return TYPE_CHAT.equals(type) ? "Live chat" : "Ticket";
    }

    /** Nhãn chủ đề tiếng Việt. */
    public static String topicLabel(String topic, String type) {
        if (topic == null || topic.isBlank()) {
            return TYPE_CHAT.equals(type) ? "Tư vấn" : "Khiếu nại";
        }
        return switch (topic) {
            case "hoi_don" -> "Hỏi đơn hàng";
            case "bao_hanh" -> "Bảo hành";
            case "tu_van" -> "Tư vấn";
            case "khac" -> "Khác";
            default -> "Khiếu nại";
        };
    }

    /** Nhãn phòng ban trên UI. */
    public static String roleLabel(String department) {
        if (department == null) {
            return "CSKH";
        }
        return switch (department) {
            case "admin" -> "Quản trị viên";
            case "crm" -> "Quản lý CRM";
            case "cs" -> "CSKH";
            default -> "CSKH";
        };
    }

    /** Nhãn RFM trên panel khách. */
    public static String tierLabel(String rfm) {
        if (rfm == null || rfm.isBlank()) {
            return "Other";
        }
        return switch (rfm) {
            case "champions" -> "Champions";
            case "loyal" -> "Loyal";
            case "potential" -> "Potential";
            case "at_risk" -> "At Risk";
            case "lost" -> "Lost";
            default -> "Other";
        };
    }

    /** Nhãn trạng thái hội thoại. */
    public static String statusLabel(String status) {
        if (status == null) {
            return "Mở";
        }
        return switch (status) {
            case STATUS_IN_PROGRESS -> "Đang xử lý";
            case STATUS_CLOSED -> "Đã giải quyết";
            default -> "Mở";
        };
    }

    /** {@code true} nếu {@code type} là chat hoặc ticket. */
    public static boolean knownType(String type) {
        return TYPES.contains(type);
    }

    /** {@code true} nếu trạng thái thuộc open / in_progress / closed. */
    public static boolean knownStatus(String status) {
        return STATUSES.contains(status);
    }

    /** {@code true} nếu ưu tiên low / normal / high. */
    public static boolean knownPriority(String priority) {
        return PRIORITIES.contains(priority);
    }

    /** {@code true} nếu chủ đề nằm trong tập cho phép. */
    public static boolean knownTopic(String topic) {
        return TOPICS.contains(topic);
    }

    /**
     * Hạn SLA: high 1 giờ, normal 4 giờ, low 24 giờ kể từ lúc mở.
     */
    public static Instant slaDueAt(Conversation conversation) {
        Instant opened = conversation.openedAt() != null
                ? conversation.openedAt()
                : conversation.lastMessageAt();
        if (opened == null) {
            opened = Instant.EPOCH;
        }
        Duration window = switch (conversation.priority() == null ? PRIORITY_NORMAL : conversation.priority()) {
            case PRIORITY_HIGH -> Duration.ofHours(1);
            case PRIORITY_LOW -> Duration.ofHours(24);
            default -> Duration.ofHours(4);
        };
        return opened.plus(window);
    }

    /** {@code ok} còn hạn, {@code due} sắp hết, {@code breached} quá hạn, {@code done} đã đóng. */
    public static String slaState(Conversation conversation, Instant now) {
        if (STATUS_CLOSED.equals(conversation.status())) {
            return "done";
        }
        Instant due = slaDueAt(conversation);
        if (now.isAfter(due)) {
            return "breached";
        }
        if (!now.plus(Duration.ofMinutes(15)).isBefore(due)) {
            return "due";
        }
        return "ok";
    }
}
