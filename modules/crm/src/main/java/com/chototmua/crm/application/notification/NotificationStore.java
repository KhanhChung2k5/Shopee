package com.chototmua.crm.application.notification;

import com.chototmua.crm.domain.notification.AppNotification;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Kho thông báo in-app. Khách chỉ đọc hộp thư của chính mình. */
public interface NotificationStore {

    /** Thêm hàng loạt thư vào hộp thư. */
    void append(List<AppNotification> notifications);

    /** Hộp thư một người, mới trước. */
    List<AppNotification> findByUser(UUID userId);

    /** Số thư {@code sent} của một chiến dịch/khảo sát. */
    int countByReference(String referenceType, UUID referenceId);

    /** Đếm theo trạng thái (sent / scheduled / read). */
    int countStatus(String referenceType, UUID referenceId, String status);

    /** Trang người nhận theo trạng thái. */
    List<AppNotification> pageByStatus(String referenceType, UUID referenceId, String status, int offset, int limit);

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

    /** Xóa một thư (ví dụ khách không còn active khi đến giờ phát). */
    void deleteById(UUID id);

    /** Đổi giờ gửi của thư chưa phát. Thư đã gửi giữ nguyên. */
    void reschedule(String referenceType, UUID referenceId, Instant startAt);
}
