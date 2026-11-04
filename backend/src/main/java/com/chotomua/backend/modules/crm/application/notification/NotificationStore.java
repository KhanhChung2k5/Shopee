package com.chotomua.backend.modules.crm.application.notification;

import com.chotomua.backend.modules.crm.domain.notification.AppNotification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Kho thông báo in-app. Khách chỉ đọc hộp thư của chính mình.
 * Các hàm theo {@code (referenceType, referenceId)} hiểu ba phạm vi:
 * {@link #SCOPE_CAMPAIGN} = thư do một chiến dịch gửi (theo {@code campaignId}, kể cả thư khảo sát chiến dịch mang theo);
 * {@code survey} = mọi thư mời của một khảo sát; {@link #SCOPE_SURVEY_DIRECT} = thư mời khảo sát gửi thẳng vào
 * hộp thư (không qua chiến dịch, không gắn đơn); {@link #SCOPE_SURVEY_OWN} = thư mời do chính khảo sát sinh ra
 * (gửi thẳng hoặc sau mua hàng), không gồm thư có nội dung riêng của chiến dịch.
 */
public interface NotificationStore {

    String SCOPE_CAMPAIGN = "campaign";

    /** Mail counts of one campaign: delivered (sent + read), read, still scheduled, and the letter's text. */
    record CampaignMailStats(int sent, int read, int scheduled, String content) {
        public static final CampaignMailStats NONE = new CampaignMailStats(0, 0, 0, null);
    }

    /** Counts for many campaigns at once (the campaign list). The JDBC store answers with one grouped query. */
    default java.util.Map<UUID, CampaignMailStats> campaignStats(java.util.Collection<UUID> campaignIds) {
        java.util.Map<UUID, CampaignMailStats> stats = new java.util.HashMap<>();
        for (UUID id : campaignIds) {
            stats.put(id, new CampaignMailStats(
                    countStatus(SCOPE_CAMPAIGN, id, "sent") + countStatus(SCOPE_CAMPAIGN, id, "read"),
                    countStatus(SCOPE_CAMPAIGN, id, "read"),
                    countStatus(SCOPE_CAMPAIGN, id, "scheduled"),
                    contentOf(SCOPE_CAMPAIGN, id)));
        }
        return stats;
    }
    String SCOPE_SURVEY_DIRECT = "survey_direct";
    String SCOPE_SURVEY_OWN = "survey_own";

    /** Thêm hàng loạt thư vào hộp thư. */
    void append(List<AppNotification> notifications);

    /** Số thư khách chưa đọc (đã vào hộp thư, chưa mở) — cho chuông thông báo, không tải nội dung. */
    default int countUnread(UUID userId) {
        return (int) findByUser(userId).stream().filter(row -> "sent".equals(row.status())).count();
    }

    /** Hộp thư một người, mới trước. */
    List<AppNotification> findByUser(UUID userId);

    /** Một thư theo mã, rỗng nếu đã xóa. */
    Optional<AppNotification> find(UUID id);

    /** Số thư đã vào hộp thư ({@code sent} hoặc {@code read}) của một chiến dịch/khảo sát. */
    int countByReference(String referenceType, UUID referenceId);

    /** Đếm theo trạng thái (sent / scheduled / read). */
    int countStatus(String referenceType, UUID referenceId, String status);

    /** Trang người nhận theo trạng thái. */
    List<AppNotification> pageByStatus(String referenceType, UUID referenceId, String status, int offset, int limit);

    /** Trang người đã nhận thư ({@code sent} hoặc {@code read}): khách đọc thư rồi vẫn là người đã nhận. */
    List<AppNotification> pageDelivered(String referenceType, UUID referenceId, int offset, int limit);

    /** Nội dung thư mẫu của lượt gửi (lấy bản đầu). */
    String contentOf(String referenceType, UUID referenceId);

    /** Khách đã có thư của một chiến dịch hoặc khảo sát. */
    Set<UUID> recipientIds(String referenceType, UUID referenceId);

    /** Mỗi khách chỉ giữ một thư mới nhất của cùng khảo sát hoặc chiến dịch. */
    void collapseRecipients(String referenceType, UUID referenceId);

    /** Đổi nội dung các thông báo của một chiến dịch hoặc khảo sát. */
    void updateContent(String referenceType, UUID referenceId, String content);

    /** Gỡ mọi thư gắn chiến dịch hoặc khảo sát. */
    void deleteByReference(String referenceType, UUID referenceId);

    /** Thư {@code scheduled} đã đến {@code sentAt}. */
    List<AppNotification> findScheduledDue(Instant now);

    /** Đổi trạng thái sang {@code sent}. */
    void markSent(UUID id, Instant sentAt);

    /** Khách đã mở thư: {@code sent} → {@code read}. */
    void markRead(UUID id);

    /** Xóa một thư (ví dụ khách không còn active khi đến giờ phát). */
    void deleteById(UUID id);

    /** Đổi giờ gửi của thư chưa phát. Thư đã gửi giữ nguyên. */
    void reschedule(String referenceType, UUID referenceId, Instant startAt);
}
