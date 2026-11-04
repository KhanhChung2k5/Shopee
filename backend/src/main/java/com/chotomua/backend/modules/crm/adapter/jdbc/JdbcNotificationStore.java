package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.application.notification.NotificationStore;
import com.chotomua.backend.modules.crm.domain.notification.AppNotification;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Thông báo trên bảng {@code notifications}. Không gửi SMTP. */
@Component
@Profile("!crm-fake")
public class JdbcNotificationStore implements NotificationStore {

    private final JdbcTemplate jdbc;

    private static final RowMapper<AppNotification> ROW = (rs, rowNum) -> new AppNotification(
            rs.getObject("id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("reference_type"),
            rs.getObject("reference_id", UUID.class),
            rs.getString("channel"),
            rs.getString("content"),
            rs.getString("status"),
            rs.getTimestamp("sent_at").toInstant(),
            rs.getObject("campaign_id", UUID.class),
            rs.getObject("order_id", UUID.class));

    public JdbcNotificationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * WHERE fragment for a scope; always binds (referenceType, referenceId) in that order.
     * {@code campaign} = mail a campaign sent; {@code survey_direct} = survey invitations sent straight to the inbox.
     */
    private static String scope(String referenceType) {
        if (SCOPE_CAMPAIGN.equals(referenceType)) {
            return "(? = 'campaign' AND campaign_id = ?)";
        }
        if (SCOPE_SURVEY_DIRECT.equals(referenceType)) {
            return "(? = 'survey_direct' AND reference_type = 'survey' AND reference_id = ? AND campaign_id IS NULL AND order_id IS NULL)";
        }
        if (SCOPE_SURVEY_OWN.equals(referenceType)) {
            return "(? = 'survey_own' AND reference_type = 'survey' AND reference_id = ? AND campaign_id IS NULL)";
        }
        return "(reference_type = ? AND reference_id = ?)";
    }

    @Override
    @Transactional
    public void append(List<AppNotification> notifications) {
        for (AppNotification row : notifications) {
            jdbc.update("""
                    INSERT INTO notifications
                        (id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    row.id(),
                    row.userId(),
                    row.referenceType(),
                    row.referenceId(),
                    row.channel(),
                    row.content(),
                    row.status(),
                    Timestamp.from(row.sentAt()),
                    row.campaignId(),
                    row.orderId());
        }
    }

    @Override
    public Optional<AppNotification> find(UUID id) {
        List<AppNotification> rows = jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id
                FROM notifications
                WHERE id = ?
                """, ROW, id);
        return rows.stream().findFirst();
    }

    @Override
    public List<AppNotification> findByUser(UUID userId) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id
                FROM notifications
                WHERE user_id = ?
                ORDER BY sent_at DESC
                """, ROW, userId);
    }

    @Override
    public int countUnread(UUID userId) {
        // A survey invitation already answered, or for a closed survey, needs no attention even if it was never opened.
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications n
                WHERE n.user_id = ? AND n.status = 'sent'
                  AND (n.reference_type IS DISTINCT FROM 'survey' OR NOT (
                      EXISTS (SELECT 1 FROM survey_responses r
                              WHERE r.survey_id = n.reference_id AND r.user_id = n.user_id
                                AND r.order_id IS NOT DISTINCT FROM n.order_id)
                      OR EXISTS (SELECT 1 FROM surveys s WHERE s.id = n.reference_id AND s.status = 'closed')))
                """, Integer.class, userId);
        return count == null ? 0 : count;
    }

    @Override
    public java.util.Map<UUID, CampaignMailStats> campaignStats(java.util.Collection<UUID> campaignIds) {
        java.util.Map<UUID, CampaignMailStats> stats = new java.util.HashMap<>();
        if (campaignIds.isEmpty()) {
            return stats;
        }
        String in = String.join(",", java.util.Collections.nCopies(campaignIds.size(), "?"));
        jdbc.query("""
                SELECT campaign_id,
                       COUNT(*) FILTER (WHERE status IN ('sent', 'read')) AS sent,
                       COUNT(*) FILTER (WHERE status = 'read') AS read,
                       COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
                       (ARRAY_AGG(content ORDER BY sent_at DESC))[1] AS content
                FROM notifications
                WHERE campaign_id IN (%s)
                GROUP BY campaign_id
                """.formatted(in), rs -> {
            stats.put(rs.getObject("campaign_id", UUID.class), new CampaignMailStats(
                    rs.getInt("sent"), rs.getInt("read"), rs.getInt("scheduled"), rs.getString("content")));
        }, campaignIds.toArray());
        return stats;
    }

    @Override
    public int countByReference(String referenceType, UUID referenceId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE %s AND status IN ('sent', 'read')
                """.formatted(scope(referenceType)), Integer.class, referenceType, referenceId);
        return count == null ? 0 : count;
    }

    @Override
    public int countStatus(String referenceType, UUID referenceId, String status) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notifications
                WHERE %s AND status = ?
                """.formatted(scope(referenceType)), Integer.class, referenceType, referenceId, status);
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
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id
                FROM notifications
                WHERE %s AND status = ?
                ORDER BY sent_at, id
                LIMIT ? OFFSET ?
                """.formatted(scope(referenceType)), ROW,
                referenceType, referenceId, status, limit, offset);
    }

    @Override
    public List<AppNotification> pageDelivered(String referenceType, UUID referenceId, int offset, int limit) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id
                FROM notifications
                WHERE %s AND status IN ('sent', 'read')
                ORDER BY sent_at, id
                LIMIT ? OFFSET ?
                """.formatted(scope(referenceType)), ROW,
                referenceType, referenceId, limit, offset);
    }

    @Override
    public Set<UUID> recipientIds(String referenceType, UUID referenceId) {
        return new HashSet<>(jdbc.query("""
                SELECT user_id FROM notifications
                WHERE %s
                """.formatted(scope(referenceType)), (rs, rowNum) -> rs.getObject("user_id", UUID.class), referenceType, referenceId));
    }

    @Override
    public void collapseRecipients(String referenceType, UUID referenceId) {
        jdbc.update("""
                DELETE FROM notifications
                WHERE %s
                  AND id NOT IN (
                    SELECT DISTINCT ON (user_id) id
                    FROM notifications
                    WHERE %s
                    ORDER BY user_id, sent_at DESC
                  )
                """.formatted(scope(referenceType), scope(referenceType)), referenceType, referenceId, referenceType, referenceId);
    }

    @Override
    public String contentOf(String referenceType, UUID referenceId) {
        List<String> rows = jdbc.query("""
                SELECT content FROM notifications
                WHERE %s
                ORDER BY sent_at DESC
                LIMIT 1
                """.formatted(scope(referenceType)), (rs, rowNum) -> rs.getString("content"), referenceType, referenceId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Override
    public void updateContent(String referenceType, UUID referenceId, String content) {
        jdbc.update("""
                UPDATE notifications SET content = ?
                WHERE %s
                """.formatted(scope(referenceType)), content, referenceType, referenceId);
    }

    @Override
    public List<AppNotification> findScheduledDue(Instant now) {
        return jdbc.query("""
                SELECT id, user_id, reference_type, reference_id, channel, content, status, sent_at, campaign_id, order_id
                FROM notifications
                WHERE status = 'scheduled' AND sent_at <= ?
                """, ROW, Timestamp.from(now));
    }

    @Override
    public void markSent(UUID id, Instant sentAt) {
        jdbc.update("UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?", Timestamp.from(sentAt), id);
    }

    @Override
    public void markRead(UUID id) {
        jdbc.update("UPDATE notifications SET status = 'read' WHERE id = ? AND status IN ('sent', 'read')", id);
    }

    @Override
    public void deleteById(UUID id) {
        jdbc.update("DELETE FROM notifications WHERE id = ?", id);
    }

    @Override
    public void reschedule(String referenceType, UUID referenceId, Instant startAt) {
        jdbc.update("""
                UPDATE notifications SET sent_at = ?
                WHERE %s AND status = 'scheduled'
                """.formatted(scope(referenceType)), Timestamp.from(startAt), referenceType, referenceId);
    }

    @Override
    public void deleteByReference(String referenceType, UUID referenceId) {
        jdbc.update("""
                DELETE FROM notifications
                WHERE %s
                """.formatted(scope(referenceType)), referenceType, referenceId);
    }
}
