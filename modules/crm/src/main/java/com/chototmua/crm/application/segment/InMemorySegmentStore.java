package com.chototmua.crm.application.segment;

import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Kho phân khúc trong bộ nhớ. Chưa map JPA — không viết SQL mới.
 */
@Component
@Profile("crm-fake")
public class InMemorySegmentStore implements SegmentStore {

    private final Map<UUID, CustomerSegment> segments = new LinkedHashMap<>();
    private final Map<UUID, List<SegmentMember>> members = new LinkedHashMap<>();

    /** Xóa hết phân khúc — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        segments.clear();
        members.clear();
    }

    public synchronized void save(CustomerSegment segment, List<SegmentMember> segmentMembers) {
        segments.put(segment.id(), segment);
        members.put(segment.id(), List.copyOf(segmentMembers));
    }

    public synchronized Optional<CustomerSegment> find(UUID id) {
        return Optional.ofNullable(segments.get(id));
    }

    public synchronized List<CustomerSegment> findAll() {
        return List.copyOf(segments.values());
    }

    public synchronized List<SegmentMember> membersOf(UUID segmentId) {
        return List.copyOf(members.getOrDefault(segmentId, List.of()));
    }

    public synchronized void delete(UUID id) {
        segments.remove(id);
        members.remove(id);
    }
}
