package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.campaign.CampaignStore;
import com.chototmua.crm.domain.campaign.Campaign;
import com.chototmua.crm.domain.campaign.CampaignTarget;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Chiến dịch trên {@code campaigns} / {@code campaign_targets}.
 * Bảng không có cột khảo sát; {@code surveyId} chỉ sống trên thông báo ({@code reference_id}).
 */
@Component
@Profile("crm-db")
public class JdbcCampaignStore implements CampaignStore {

    private final JdbcTemplate jdbc;

    public JdbcCampaignStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void save(Campaign campaign, List<CampaignTarget> targets) {
        jdbc.update("""
                INSERT INTO campaigns (id, name, channel, start_at, end_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    channel = EXCLUDED.channel,
                    start_at = EXCLUDED.start_at,
                    end_at = EXCLUDED.end_at
                """,
                campaign.id(),
                campaign.name(),
                campaign.channel(),
                timestamp(campaign.startAt()),
                timestamp(campaign.endAt()));
        jdbc.update("DELETE FROM campaign_targets WHERE campaign_id = ?", campaign.id());
        for (CampaignTarget target : targets) {
            jdbc.update("""
                    INSERT INTO campaign_targets (campaign_id, segment_id)
                    VALUES (?, ?)
                    """, target.campaignId(), target.segmentId());
        }
    }

    @Override
    public Optional<Campaign> find(UUID id) {
        List<Campaign> rows = jdbc.query("""
                SELECT id, name, channel, start_at, end_at
                FROM campaigns
                WHERE id = ?
                """, (rs, rowNum) -> map(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getString("channel"), rs.getTimestamp("start_at"), rs.getTimestamp("end_at")), id);
        return rows.stream().findFirst();
    }

    @Override
    public List<Campaign> findAll() {
        return jdbc.query("""
                SELECT id, name, channel, start_at, end_at
                FROM campaigns
                ORDER BY start_at DESC NULLS LAST
                """, (rs, rowNum) -> map(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getString("channel"), rs.getTimestamp("start_at"), rs.getTimestamp("end_at")));
    }

    @Override
    public void delete(UUID id) {
        jdbc.update("DELETE FROM campaigns WHERE id = ?", id);
    }

    @Override
    public List<CampaignTarget> targetsOf(UUID campaignId) {
        return jdbc.query("""
                SELECT campaign_id, segment_id
                FROM campaign_targets
                WHERE campaign_id = ?
                """, (rs, rowNum) -> new CampaignTarget(
                rs.getObject("campaign_id", UUID.class),
                rs.getObject("segment_id", UUID.class)), campaignId);
    }

    private static Campaign map(UUID id, String name, String channel, Timestamp startAt, Timestamp endAt) {
        return new Campaign(id, name, channel, instant(startAt), instant(endAt), null);
    }

    private static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
