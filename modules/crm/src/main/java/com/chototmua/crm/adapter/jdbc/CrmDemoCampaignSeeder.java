package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.profile.CustomerProfileService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Sau khi hồ sơ và phân khúc RFM đã có số liệu, gắn chiến dịch demo và thư trong hộp thư khách.
 */
@Component
@Profile("crm-db")
@Order(300)
public class CrmDemoCampaignSeeder implements ApplicationRunner {

    private static final UUID CHAMPIONS_CAMPAIGN = UUID.fromString("ca100001-0000-4000-8000-000000000001");
    private static final UUID AT_RISK_CAMPAIGN = UUID.fromString("ca100001-0000-4000-8000-000000000002");
    private static final UUID CHAMPIONS_SEGMENT = UUID.fromString("a1000001-0000-4000-8000-000000000001");
    private static final UUID AT_RISK_SEGMENT = UUID.fromString("a1000001-0000-4000-8000-000000000004");
    private static final UUID SURVEY_ID = UUID.fromString("21000001-0000-4000-8000-000000000001");

    private static final String DEMO_ORDER_PREFIX = "d1000001-0000-4000-8000-%";
    private static final UUID BINH_ID = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    private static final UUID DUNG_ID = UUID.fromString("dddd4444-4444-4444-4444-444444444444");

    private final JdbcTemplate jdbc;
    private final CustomerProfileService profiles;

    public CrmDemoCampaignSeeder(JdbcTemplate jdbc, CustomerProfileService profiles) {
        this.jdbc = jdbc;
        this.profiles = profiles;
    }

    @Override
    public void run(ApplicationArguments args) {
        int shifted = alignDemoOrderDates();
        int lapsed = lapseWinBackCustomers();
        if (shifted > 0 || lapsed > 0) {
            refreshDemoProfiles();
        }
        fillBlankProfiles();
        replaceSegmentMembers();
        insertCampaign(
                "Chăm sóc khách Champions",
                CHAMPIONS_CAMPAIGN,
                CHAMPIONS_SEGMENT,
                "7 days",
                "30 days",
                "Cảm ơn bạn đã gắn bó với Chợ Tốt Mua. Tuần này có ưu đãi tay cầm và đĩa game cho khách thân thiết.");
        insertCampaign(
                "Kéo lại khách có nguy cơ rời",
                AT_RISK_CAMPAIGN,
                AT_RISK_SEGMENT,
                "2 days",
                "21 days",
                "Lâu rồi chưa gặp bạn tại Chợ Tốt Mua. Ghé xem đĩa game mới, có mã giảm cho đơn tiếp theo.");
        seedSurveyLetters();
    }

    /**
     * Đơn demo được tính từ mốc 2026-09-01. Dịch một lần cho khớp ngày hiện tại
     * để thang RFM (Champions trong 60 ngày) vẫn đúng như lúc soạn seed.
     */
    private int alignDemoOrderDates() {
        return jdbc.update("""
                UPDATE orders o
                SET created_at = o.created_at + ((CURRENT_DATE - DATE '2026-09-01') * INTERVAL '1 day')
                WHERE o.id::text LIKE ?
                  AND EXISTS (
                    SELECT 1 FROM orders m
                    WHERE m.id = 'd1000001-0000-4000-8000-000000000005'::uuid
                      AND (m.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = DATE '2026-07-23'
                  )
                """, DEMO_ORDER_PREFIX);
    }

    /**
     * Seed không có khách mua dày nhưng lần cuối đã quá 180 ngày, nên At Risk luôn trống.
     * Lùi đơn đã giao gần đây của bốn khách demo (giữ Bình và Dũng ở nhóm Loyal).
     */
    private int lapseWinBackCustomers() {
        return jdbc.update("""
                UPDATE orders
                SET created_at = created_at - INTERVAL '200 days'
                WHERE status = 'delivered'
                  AND created_at > (CURRENT_TIMESTAMP - INTERVAL '180 days')
                  AND user_id IN (
                    SELECT user_id FROM (
                      SELECT o.user_id
                      FROM orders o
                      WHERE o.status = 'delivered'
                        AND o.id::text LIKE ?
                      GROUP BY o.user_id
                      HAVING COUNT(*) = 3
                         AND o.user_id NOT IN (?, ?)
                      ORDER BY o.user_id
                      LIMIT 4
                    ) picked
                  )
                """, DEMO_ORDER_PREFIX, BINH_ID, DUNG_ID);
    }

    /** Khách chưa có nhãn RFM được chấm một lần từ đơn đã giao. Không ghi đè nhãn đã có. */
    private void fillBlankProfiles() {
        jdbc.update("""
                UPDATE users u
                SET
                    total_orders = COALESCE(s.cnt, 0),
                    ltv = COALESCE(s.ltv, 0),
                    last_purchase_at = s.last_at,
                    rfm_segment = CASE
                        WHEN s.r BETWEEN 4 AND 5 AND s.f BETWEEN 4 AND 5 AND s.m BETWEEN 4 AND 5 THEN 'champions'
                        WHEN s.r BETWEEN 2 AND 5 AND s.f BETWEEN 3 AND 5 AND s.m BETWEEN 3 AND 5 THEN 'loyal'
                        WHEN s.r BETWEEN 1 AND 2 AND s.f BETWEEN 3 AND 5 AND s.m BETWEEN 3 AND 5 THEN 'at_risk'
                        WHEN s.r BETWEEN 3 AND 5 AND s.f BETWEEN 1 AND 3 AND s.m BETWEEN 1 AND 3 THEN 'potential'
                        WHEN s.r BETWEEN 1 AND 2 AND s.f BETWEEN 1 AND 2 AND s.m BETWEEN 1 AND 2 THEN 'lost'
                        ELSE 'other'
                    END
                FROM (
                    SELECT
                        u2.id AS user_id,
                        COALESCE(agg.cnt, 0) AS cnt,
                        COALESCE(agg.ltv, 0) AS ltv,
                        agg.last_at,
                        CASE
                            WHEN agg.last_at IS NULL OR CURRENT_DATE - agg.last_at > 180 THEN 1
                            WHEN CURRENT_DATE - agg.last_at <= 30 THEN 5
                            WHEN CURRENT_DATE - agg.last_at <= 60 THEN 4
                            WHEN CURRENT_DATE - agg.last_at <= 90 THEN 3
                            ELSE 2
                        END AS r,
                        CASE
                            WHEN COALESCE(agg.cnt, 0) <= 1 THEN 1
                            WHEN agg.cnt = 2 THEN 2
                            WHEN agg.cnt <= 4 THEN 3
                            WHEN agg.cnt <= 7 THEN 4
                            ELSE 5
                        END AS f,
                        CASE
                            WHEN COALESCE(agg.spend, 0) < 500000 THEN 1
                            WHEN agg.spend < 1500000 THEN 2
                            WHEN agg.spend < 4000000 THEN 3
                            WHEN agg.spend < 8000000 THEN 4
                            ELSE 5
                        END AS m
                    FROM users u2
                    LEFT JOIN (
                        SELECT
                            user_id,
                            COUNT(*)::int AS cnt,
                            SUM(total_amount) AS spend,
                            MAX(created_at)::date AS last_at,
                            ROUND(
                                COALESCE(SUM(total_amount) FILTER (
                                    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                                ), 0)
                                * CASE
                                    WHEN MIN(created_at)::date IS NULL THEN 0
                                    WHEN MAX(created_at)::date <= MIN(created_at)::date THEN 1
                                    ELSE (MAX(created_at)::date - MIN(created_at)::date)::numeric / 365
                                END
                            , 2) AS ltv
                        FROM orders
                        WHERE status = 'delivered'
                        GROUP BY user_id
                    ) agg ON agg.user_id = u2.id
                    WHERE u2.rfm_segment IS NULL
                      AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u2.id)
                ) s
                WHERE u.id = s.user_id
                """);
    }

    /** Gắn thành viên phân khúc RFM từ nhãn đã lưu, một câu lệnh, không duyệt từng khách. */
    private void replaceSegmentMembers() {
        jdbc.update("""
                DELETE FROM segment_members
                WHERE segment_id IN (
                    'a1000001-0000-4000-8000-000000000001'::uuid,
                    'a1000001-0000-4000-8000-000000000002'::uuid,
                    'a1000001-0000-4000-8000-000000000003'::uuid,
                    'a1000001-0000-4000-8000-000000000004'::uuid,
                    'a1000001-0000-4000-8000-000000000005'::uuid,
                    'a1000001-0000-4000-8000-000000000006'::uuid
                )
                """);
        jdbc.update("""
                INSERT INTO segment_members (segment_id, user_id, added_at)
                SELECT CASE u.rfm_segment
                           WHEN 'champions' THEN 'a1000001-0000-4000-8000-000000000001'::uuid
                           WHEN 'loyal' THEN 'a1000001-0000-4000-8000-000000000002'::uuid
                           WHEN 'potential' THEN 'a1000001-0000-4000-8000-000000000003'::uuid
                           WHEN 'at_risk' THEN 'a1000001-0000-4000-8000-000000000004'::uuid
                           WHEN 'lost' THEN 'a1000001-0000-4000-8000-000000000005'::uuid
                           ELSE 'a1000001-0000-4000-8000-000000000006'::uuid
                       END,
                       u.id,
                       now()
                FROM users u
                WHERE u.status = 'active'
                  AND u.rfm_segment IN ('champions', 'loyal', 'potential', 'at_risk', 'lost', 'other')
                  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id)
                """);
    }

    private void refreshDemoProfiles() {
        List<UUID> ids = jdbc.query("""
                SELECT u.id
                FROM users u
                WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id)
                  AND (
                    u.id::text LIKE 'c1000001-0000-4000-8000-%'
                    OR u.id IN (
                        'aaaa1111-1111-1111-1111-111111111111'::uuid,
                        'bbbb2222-2222-2222-2222-222222222222'::uuid,
                        'cccc3333-3333-3333-3333-333333333333'::uuid,
                        'dddd4444-4444-4444-4444-444444444444'::uuid,
                        'eeee5555-5555-5555-5555-555555555555'::uuid,
                        'ffff6666-6666-6666-6666-666666666666'::uuid,
                        '77777777-7777-7777-7777-777777777777'::uuid
                    )
                  )
                """, (rs, rowNum) -> rs.getObject("id", UUID.class));
        for (UUID id : ids) {
            profiles.recalculate(id);
        }
    }

    private void insertCampaign(
            String name,
            UUID campaignId,
            UUID segmentId,
            String startedAgo,
            String endsIn,
            String content
    ) {
        Integer segment = jdbc.queryForObject(
                "SELECT COUNT(*) FROM customer_segments WHERE id = ?",
                Integer.class,
                segmentId);
        if (segment == null || segment == 0) {
            return;
        }
        jdbc.update("""
                INSERT INTO campaigns (id, name, channel, start_at, end_at)
                VALUES (?, ?, 'in_app', now() - interval '%s', now() + interval '%s')
                ON CONFLICT (id) DO NOTHING
                """.formatted(startedAgo, endsIn),
                campaignId,
                name);
        jdbc.update("""
                INSERT INTO campaign_targets (campaign_id, segment_id)
                VALUES (?, ?)
                ON CONFLICT DO NOTHING
                """,
                campaignId,
                segmentId);
        seedLetters(campaignId, "campaign", content, """
                SELECT sm.user_id
                FROM segment_members sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.segment_id = ? AND u.status = 'active'
                """, segmentId);
    }

    private void seedSurveyLetters() {
        Integer survey = jdbc.queryForObject(
                "SELECT COUNT(*) FROM surveys WHERE id = ?",
                Integer.class,
                SURVEY_ID);
        if (survey == null || survey == 0) {
            return;
        }
        seedLetters(SURVEY_ID, "survey", "Mời bạn đánh giá đơn hàng vừa nhận tại Chợ Tốt Mua. Chỉ mất một phút.", """
                SELECT DISTINCT u.id
                FROM users u
                WHERE u.status = 'active'
                  AND (
                    u.id IN (
                        'aaaa1111-1111-1111-1111-111111111111'::uuid,
                        'bbbb2222-2222-2222-2222-222222222222'::uuid,
                        'dddd4444-4444-4444-4444-444444444444'::uuid,
                        '77777777-7777-7777-7777-777777777777'::uuid
                    )
                    OR EXISTS (
                        SELECT 1 FROM survey_responses r
                        WHERE r.survey_id = '%s'::uuid AND r.user_id = u.id
                    )
                  )
                """.formatted(SURVEY_ID));
    }

    private void seedLetters(UUID referenceId, String referenceType, String content, String userSql, Object... userArgs) {
        jdbc.query(userSql, (rs, rowNum) -> rs.getObject(1, UUID.class), userArgs)
                .forEach(userId -> jdbc.update("""
                        INSERT INTO notifications
                            (id, user_id, reference_type, reference_id, channel, content, status, sent_at)
                        VALUES (?, ?, ?, ?, 'in_app', ?, 'sent', now() - interval '1 day')
                        ON CONFLICT (id) DO NOTHING
                        """,
                        UUID.nameUUIDFromBytes((referenceType + ":" + referenceId + ":" + userId)
                                .getBytes(StandardCharsets.UTF_8)),
                        userId,
                        referenceType,
                        referenceId,
                        content));
    }
}
