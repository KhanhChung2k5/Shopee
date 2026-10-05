package com.chototmua.crm.application.notification;

import com.chototmua.crm.domain.notification.AppNotification;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Hộp thư trong bộ nhớ. Không gọi SMTP. */
@Component
@Profile("crm-fake")
public class InMemoryNotificationStore implements NotificationStore {

    private final List<AppNotification> rows = new ArrayList<>();

    /** Xóa hết thư — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        rows.clear();
    }

    @Override
    public synchronized void append(List<AppNotification> notifications) {
        rows.addAll(notifications);
    }

    @Override
    public synchronized List<AppNotification> findByUser(UUID userId) {
        return rows.stream()
                .filter(row -> userId.equals(row.userId()))
                .sorted(Comparator.comparing(AppNotification::sentAt).reversed())
                .toList();
    }

    @Override
    public synchronized int countByReference(String referenceType, UUID referenceId) {
        return (int) rows.stream()
                .filter(row -> matches(row, referenceType, referenceId) && "sent".equals(row.status()))
                .count();
    }

    @Override
    public synchronized int countStatus(String referenceType, UUID referenceId, String status) {
        return (int) rows.stream()
                .filter(row -> matches(row, referenceType, referenceId) && status.equals(row.status()))
                .count();
    }

    @Override
    public synchronized List<AppNotification> pageByStatus(
            String referenceType,
            UUID referenceId,
            String status,
            int offset,
            int limit
    ) {
        return rows.stream()
                .filter(row -> matches(row, referenceType, referenceId) && status.equals(row.status()))
                .sorted(Comparator.comparing(AppNotification::sentAt).thenComparing(AppNotification::id))
                .skip(Math.max(offset, 0))
                .limit(Math.max(limit, 0))
                .toList();
    }

    @Override
    public synchronized Set<UUID> recipientIds(String referenceType, UUID referenceId) {
        return rows.stream()
                .filter(row -> matches(row, referenceType, referenceId))
                .map(AppNotification::userId)
                .collect(Collectors.toSet());
    }

    @Override
    public synchronized void collapseRecipients(String referenceType, UUID referenceId) {
        Map<UUID, AppNotification> latest = new LinkedHashMap<>();
        List<AppNotification> others = new ArrayList<>();
        for (AppNotification row : rows) {
            if (!matches(row, referenceType, referenceId)) {
                others.add(row);
                continue;
            }
            AppNotification current = latest.get(row.userId());
            if (current == null || row.sentAt().isAfter(current.sentAt())) {
                latest.put(row.userId(), row);
            }
        }
        rows.clear();
        rows.addAll(others);
        rows.addAll(latest.values());
    }

    @Override
    public synchronized String contentOf(String referenceType, UUID referenceId) {
        return rows.stream()
                .filter(row -> matches(row, referenceType, referenceId))
                .map(AppNotification::content)
                .findFirst()
                .orElse(null);
    }

    @Override
    public synchronized void updateContent(String referenceType, UUID referenceId, String content) {
        for (int index = 0; index < rows.size(); index++) {
            AppNotification row = rows.get(index);
            if (!matches(row, referenceType, referenceId)) {
                continue;
            }
            rows.set(index, new AppNotification(
                    row.id(),
                    row.userId(),
                    row.referenceType(),
                    row.referenceId(),
                    row.channel(),
                    content,
                    row.status(),
                    row.sentAt()));
        }
    }

    @Override
    public synchronized void deleteByReference(String referenceType, UUID referenceId) {
        rows.removeIf(row -> matches(row, referenceType, referenceId));
    }

    @Override
    public synchronized List<AppNotification> findScheduledDue(Instant now) {
        return rows.stream()
                .filter(row -> "scheduled".equals(row.status()) && !row.sentAt().isAfter(now))
                .toList();
    }

    @Override
    public synchronized void markSent(UUID id, Instant sentAt) {
        replace(id, sentAt, "sent");
    }

    @Override
    public synchronized void deleteById(UUID id) {
        rows.removeIf(row -> id.equals(row.id()));
    }

    @Override
    public synchronized void reschedule(String referenceType, UUID referenceId, Instant startAt) {
        for (int index = 0; index < rows.size(); index++) {
            AppNotification row = rows.get(index);
            if (!matches(row, referenceType, referenceId) || !"scheduled".equals(row.status())) {
                continue;
            }
            rows.set(index, copy(row, startAt, row.status()));
        }
    }

    /** Thay {@code sentAt} và trạng thái của một thư. */
    private void replace(UUID id, Instant sentAt, String status) {
        for (int index = 0; index < rows.size(); index++) {
            AppNotification row = rows.get(index);
            if (!id.equals(row.id())) {
                continue;
            }
            rows.set(index, copy(row, sentAt, status));
            return;
        }
    }

    /** Bản sao thư với giờ gửi / trạng thái mới. */
    private static AppNotification copy(AppNotification row, Instant sentAt, String status) {
        return new AppNotification(
                row.id(),
                row.userId(),
                row.referenceType(),
                row.referenceId(),
                row.channel(),
                row.content(),
                status,
                sentAt);
    }

    /** Cùng chiến dịch hoặc khảo sát. */
    private static boolean matches(AppNotification row, String referenceType, UUID referenceId) {
        return referenceType.equals(row.referenceType()) && referenceId.equals(row.referenceId());
    }
}
