package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.exception.InvalidSegmentRuleException;
import com.chototmua.crm.application.segment.SegmentRules;
import com.chototmua.crm.application.segment.SegmentStore;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Phân khúc trên {@code customer_segments} / {@code segment_members}.
 * Schema không có {@code created_at}; mốc tạo nằm trong JSON rule dưới khóa {@code _createdAt}.
 */
@Component
@Profile("crm-db")
public class JdbcSegmentStore implements SegmentStore {

    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public JdbcSegmentStore(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void save(CustomerSegment segment, List<SegmentMember> segmentMembers) {
        Map<String, Object> payload = new LinkedHashMap<>(SegmentRules.toDefinition(segment.rule()));
        if (segment.createdAt() != null) {
            payload.put("_createdAt", segment.createdAt().toString());
        }
        String json = write(payload);
        jdbc.update("""
                INSERT INTO customer_segments (id, name, rule_definition)
                VALUES (?, ?, ?::jsonb)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rule_definition = EXCLUDED.rule_definition
                """, segment.id(), segment.name(), json);
        jdbc.update("DELETE FROM segment_members WHERE segment_id = ?", segment.id());
        for (SegmentMember member : segmentMembers) {
            jdbc.update("""
                    INSERT INTO segment_members (segment_id, user_id, added_at)
                    VALUES (?, ?, ?)
                    """, segment.id(), member.userId(), Timestamp.from(member.addedAt()));
        }
    }

    @Override
    public Optional<CustomerSegment> find(UUID id) {
        List<CustomerSegment> rows = jdbc.query(
                "SELECT id, name, rule_definition::text AS rule_definition FROM customer_segments WHERE id = ?",
                (rs, rowNum) -> mapSegment(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("rule_definition")),
                id);
        return rows.stream().findFirst();
    }

    @Override
    public List<CustomerSegment> findAll() {
        return jdbc.query(
                "SELECT id, name, rule_definition::text AS rule_definition FROM customer_segments ORDER BY name",
                (rs, rowNum) -> mapSegment(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("rule_definition")));
    }

    @Override
    public List<SegmentMember> membersOf(UUID segmentId) {
        return jdbc.query("""
                SELECT segment_id, user_id, added_at
                FROM segment_members
                WHERE segment_id = ?
                ORDER BY added_at
                """, (rs, rowNum) -> new SegmentMember(
                rs.getObject("segment_id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getTimestamp("added_at").toInstant()), segmentId);
    }

    @Override
    public void delete(UUID id) {
        jdbc.update("DELETE FROM customer_segments WHERE id = ?", id);
    }

    private CustomerSegment mapSegment(UUID id, String name, String json) {
        Map<String, Object> raw = read(json);
        Object createdRaw = raw.remove("_createdAt");
        Instant createdAt = createdRaw == null ? Instant.EPOCH : Instant.parse(createdRaw.toString());
        return new CustomerSegment(id, name, SegmentRules.parse(raw), createdAt);
    }

    private String write(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new InvalidSegmentRuleException("Không ghi được luật phân khúc.", exception);
        }
    }

    private Map<String, Object> read(String json) {
        if (json == null || json.isBlank()) {
            throw new InvalidSegmentRuleException("Phân khúc thiếu rule_definition.");
        }
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (Exception exception) {
            throw new InvalidSegmentRuleException("rule_definition không phải JSON hợp lệ.", exception);
        }
    }
}
