package com.chototmua.crm.application.segment;

import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho phân khúc: bảng {@code customer_segments} khi chạy PostgreSQL, bộ nhớ khi kiểm thử. */
public interface SegmentStore {

    /** Ghi phân khúc và thay toàn bộ thành viên. */
    void save(CustomerSegment segment, List<SegmentMember> segmentMembers);

    Optional<CustomerSegment> find(UUID id);

    List<CustomerSegment> findAll();

    List<SegmentMember> membersOf(UUID segmentId);

    /** Xóa phân khúc và thành viên. */
    void delete(UUID id);
}
