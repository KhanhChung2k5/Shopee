package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.notification.NotificationStore;
import com.chototmua.crm.domain.notification.AppNotification;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Thông báo trên bảng {@code notifications}. Không gửi SMTP. */
@Component
@Profile("crm-db")
public class JdbcNotificationStore implements NotificationStore {

    private final JdbcTemplate jdbc;

    public JdbcNotificationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void append(List<AppNotification> notifications) {
        for (AppNotification row : notifications) {
            jdbc.update("""
                    INSERT INTO notifications
                        (id, user_id, reference_type, reference_id, channel, content, status, sent_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    row.id(),
                    row.userId(),
                    row.referenceType(),
                    row.referenceId(),
                    row.channel(),
                    row.content(),
                    row.status(),
                    Timestamp.from(row.sentAt()));
        }
    }

    @Override
    public List<AppNotification> findByUser(UUID userId) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY sent_at DESC
                """, (rs, rowNum) -> new AppNotification(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("reference_type"),
                rs.getObject("reference_id", UUID.class),
                rs.getString("channel"),
                rs.getString("content"),
                rs.getString("status"),
                rs.getTimestamp("sent_at").toInstant()), userId);
    }

    @Override
    public int countByReference(String referenceType, UUID referenceId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE reference_type = ? AND reference_id = ? AND status = 'sent'
                """, Integer.class, referenceType, referenceId);
        return count == null ? 0 : count;
    }

    @Override
    public int countStatus(String referenceType, UUID referenceId, String status) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE reference_type = ? AND reference_id = ? AND status = ?
                """, Integer.class, referenceType, referenceId, status);
        return count == null ? 0 : count;
    }

    @Override
    public List<AppNotification> pageByStatus(
            String referenceType,
            UUID referenceId,
            String status,
            int offset,
            int limit
    ) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at
                FROM notifications
                WHERE reference_type = ? AND reference_id = ? AND status = ?
                ORDER BY sent_at, id
                LIMIT ? OFFSET ?
                """, (rs, rowNum) -> new AppNotification(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("reference_type"),
                rs.getObject("reference_id", UUID.class),
                rs.getString("channel"),
                rs.getString("content"),
                rs.getString("status"),
                rs.getTimestamp("sent_at").toInstant()),
                referenceType, referenceId, status, limit, offset);
    }

    @Override
    public Set<UUID> recipientIds(String referenceType, UUID referenceId) {
        return new HashSet<>(jdbc.query("""
                SELECT user_id FROM notifications
                WHERE reference_type = ? AND reference_id = ?
                """, (rs, rowNum) -> rs.getObject("user_id", UUID.class), referenceType, referenceId));
    }

    @Override
    public void collapseRecipients(String referenceType, UUID referenceId) {
        jdbc.update("""
                DELETE FROM notifications
                WHERE reference_type = ? AND reference_id = ?
                  AND id NOT IN (
                    SELECT DISTINCT ON (user_id) id
                    FROM notifications
                    WHERE reference_type = ? AND reference_id = ?
                    ORDER BY user_id, sent_at DESC
                  )
                """, referenceType, referenceId, referenceType, referenceId);
    }

    @Override
    public String contentOf(String referenceType, UUID referenceId) {
        List<String> rows = jdbc.query("""
                SELECT content FROM notifications
                WHERE reference_type = ? AND reference_id = ?
                ORDER BY sent_at DESC
                LIMIT 1
                """, (rs, rowNum) -> rs.getString("content"), referenceType, referenceId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Override
    public void updateContent(String referenceType, UUID referenceId, String content) {
        jdbc.update("""
                UPDATE notifications SET content = ?
                WHERE reference_type = ? AND reference_id = ?
                """, content, referenceType, referenceId);
    }

    @Override
    public List<AppNotification> findScheduledDue(Instant now) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at
                FROM notifications
                WHERE status = 'scheduled' AND sent_at <= ?
                """, (rs, rowNum) -> new AppNotification(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("reference_type"),
                rs.getObject("reference_id", UUID.class),
                rs.getString("channel"),
                rs.getString("content"),
                rs.getString("status"),
                rs.getTimestamp("sent_at").toInstant()), Timestamp.from(now));
    }

    @Override
    public void markSent(UUID id, Instant sentAt) {
        jdbc.update("UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?", Timestamp.from(sentAt), id);
    }

    @Override
    public void deleteById(UUID id) {
        jdbc.update("DELETE FROM notifications WHERE id = ?", id);
    }

    @Override
    public void reschedule(String referenceType, UUID referenceId, Instant startAt) {
        jdbc.update("""
                UPDATE notifications SET sent_at = ?
                WHERE reference_type = ? AND reference_id = ? AND status = 'scheduled'
                """, Timestamp.from(startAt), referenceType, referenceId);
    }

    @Override
    public void deleteByReference(String referenceType, UUID referenceId) {
        jdbc.update("""
                DELETE FROM notifications
                WHERE reference_type = ? AND reference_id = ?
                """, referenceType, referenceId);
    }
}
