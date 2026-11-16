package com.chototmua.crm.application.segment;

import com.chototmua.crm.application.exception.SegmentLockedException;
import com.chototmua.crm.application.exception.SegmentNotFoundException;
import com.chototmua.crm.application.report.AgeBucket;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.segment.SegmentRule;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.web.dto.SegmentListResponse;
import com.chototmua.crm.web.dto.SegmentMemberResponse;
import com.chototmua.crm.web.dto.SegmentResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * CRUD phân khúc preset và tính {@code segment_members} từ cổng danh tính + đơn đã giao.
 * Khách {@code locked} / {@code deleted} không được thêm vào thành viên mới.
 */
@Service
public class SegmentService {

    private static final List<RfmPreset> RFM_DEFAULTS = List.of(
            new RfmPreset("a1000001-0000-4000-8000-000000000001", "Champions", RfmClassifier.CHAMPIONS),
            new RfmPreset("a1000001-0000-4000-8000-000000000002", "Loyal", RfmClassifier.LOYAL),
            new RfmPreset("a1000001-0000-4000-8000-000000000003", "Potential", RfmClassifier.POTENTIAL),
            new RfmPreset("a1000001-0000-4000-8000-000000000004", "At Risk", RfmClassifier.AT_RISK),
            new RfmPreset("a1000001-0000-4000-8000-000000000005", "Lost", RfmClassifier.LOST),
            new RfmPreset("a1000001-0000-4000-8000-000000000006", "Other", RfmClassifier.OTHER)
    );

    private final IdentityPort identity;
    private final OrderPort orders;
    private final SegmentStore store;
    private final RfmSegmentSource rfm;
    private final Clock clock;

    @Autowired
    public SegmentService(
            IdentityPort identity,
            OrderPort orders,
            SegmentStore store,
            RfmSegmentSource rfm
    ) {
        this(identity, orders, store, rfm, Clock.systemDefaultZone());
    }

    /** Kiểm thử gắn đồng hồ khi ghi {@code addedAt}. */
    SegmentService(
            IdentityPort identity,
            OrderPort orders,
            SegmentStore store,
            RfmSegmentSource rfm,
            Clock clock
    ) {
        this.identity = identity;
        this.orders = orders;
        this.store = store;
        this.rfm = rfm;
        this.clock = clock;
    }

    /**
     * Tạo một phân khúc cho mỗi nhãn RFM nếu chưa có.
     * Phân khúc cùng nhãn do người dùng tạo trước đó được giữ nguyên.
     */
    public void ensureRfmDefaults() {
        Set<String> present = new HashSet<>();
        for (CustomerSegment segment : store.findAll()) {
            if (SegmentRules.RFM.equals(segment.rule().preset()) && segment.rule().rfmSegment() != null) {
                present.add(segment.rule().rfmSegment());
            }
        }
        Instant now = Instant.now(clock);
        for (RfmPreset preset : RFM_DEFAULTS) {
            if (present.contains(preset.label())) {
                continue;
            }
            SegmentRule rule = SegmentRules.parse(Map.of("preset", SegmentRules.RFM, "segment", preset.label()));
            CustomerSegment segment = new CustomerSegment(preset.id(), preset.name(), rule, now);
            store.save(segment, match(segment.id(), rule, now, Map.of()));
        }
    }

    /**
     * Tính lại thành viên các phân khúc RFM mặc định.
     * Lần tạo đầu chạy khi chưa có đơn, nên cần gọi lại sau khi nạp đơn demo.
     */
    public void refreshRfmMembers() {
        Instant now = Instant.now(clock);
        for (RfmPreset preset : RFM_DEFAULTS) {
            SegmentRule rule = SegmentRules.parse(Map.of("preset", SegmentRules.RFM, "segment", preset.label()));
            CustomerSegment segment = store.find(preset.id())
                    .orElseGet(() -> new CustomerSegment(preset.id(), preset.name(), rule, now));
            store.save(segment, match(segment.id(), segment.rule(), now, addedAtByUser(segment.id())));
        }
    }

    /** Câu chuyện 4–7: quản trị, quản lý CRM hoặc CSKH. */
    public SegmentListResponse list(UUID actorId) {
        identity.requireCrmStaff(actorId);
        List<SegmentResponse> rows = store.findAll().stream()
                .map(segment -> toResponse(segment, store.membersOf(segment.id())))
                .toList();
        return new SegmentListResponse(rows);
    }

    /** Chi tiết một phân khúc kèm thành viên. */
    public SegmentResponse get(UUID actorId, UUID segmentId) {
        identity.requireCrmStaff(actorId);
        return toResponse(require(segmentId), store.membersOf(segmentId));
    }

    /** Tạo phân khúc từ {@code ruleDefinition} (age / rfm / category) và tính thành viên ngay. */
    public SegmentResponse create(UUID actorId, String name, Map<String, Object> ruleDefinition) {
        identity.requireCrmStaff(actorId);
        SegmentRule rule = SegmentRules.parse(ruleDefinition);
        Instant now = Instant.now(clock);
        CustomerSegment segment = new CustomerSegment(UUID.randomUUID(), name.trim(), rule, now);
        List<SegmentMember> members = match(segment.id(), rule, now, Map.of());
        store.save(segment, members);
        return toResponse(segment, members);
    }

    /** Sửa tên và rule; phân khúc RFM mặc định bị khóa. Giữ {@code addedAt} cũ nếu khách vẫn khớp. */
    public SegmentResponse update(UUID actorId, UUID segmentId, String name, Map<String, Object> ruleDefinition) {
        identity.requireCrmStaff(actorId);
        CustomerSegment current = require(segmentId);
        requireMutable(current.id());
        SegmentRule rule = SegmentRules.parse(ruleDefinition);
        Instant now = Instant.now(clock);
        CustomerSegment updated = new CustomerSegment(current.id(), name.trim(), rule, current.createdAt());
        List<SegmentMember> members = match(current.id(), rule, now, addedAtByUser(current.id()));
        store.save(updated, members);
        return toResponse(updated, members);
    }

    /** Xóa phân khúc do người dùng tạo; không xóa preset RFM. */
    public void delete(UUID actorId, UUID segmentId) {
        identity.requireCrmStaff(actorId);
        require(segmentId);
        requireMutable(segmentId);
        store.delete(segmentId);
    }

    /** Tính lại thành viên. Khách vừa khóa hoặc xóa không được thêm lại. */
    public SegmentResponse refresh(UUID actorId, UUID segmentId) {
        identity.requireCrmStaff(actorId);
        CustomerSegment current = require(segmentId);
        Instant now = Instant.now(clock);
        List<SegmentMember> members = match(current.id(), current.rule(), now, addedAtByUser(current.id()));
        store.save(current, members);
        return toResponse(current, members);
    }

    /** Duyệt khách {@code active} và giữ những người khớp mọi preset trong rule. */
    private List<SegmentMember> match(
            UUID segmentId,
            SegmentRule rule,
            Instant now,
            Map<UUID, Instant> previousAddedAt
    ) {
        LocalDate today = LocalDate.now(clock);
        List<SegmentMember> matched = new ArrayList<>();
        for (CustomerView customer : identity.findCustomers(new CustomerFilter(null, null), false)) {
            if (!CustomerStatus.ACTIVE.equals(customer.status())) {
                continue;
            }
            if (!matches(customer, rule, today)) {
                continue;
            }
            Instant addedAt = previousAddedAt.getOrDefault(customer.id(), now);
            matched.add(new SegmentMember(segmentId, customer.id(), addedAt));
        }
        return List.copyOf(matched);
    }

    /** AND giữa các preset: tuổi, RFM, danh mục đã mua. */
    private boolean matches(CustomerView customer, SegmentRule rule, LocalDate today) {
        List<String> presets = rule.presets() == null || rule.presets().isEmpty()
                ? List.of(rule.preset())
                : rule.presets();
        for (String preset : presets) {
            boolean hit = switch (preset) {
                case SegmentRules.AGE -> ageHit(customer, rule, today);
                case SegmentRules.RFM -> rfmHit(customer, rule);
                case SegmentRules.CATEGORY -> boughtCategory(customer.id(), rule);
                default -> false;
            };
            if (!hit) {
                return false;
            }
        }
        return !presets.isEmpty();
    }

    /** Khớp nhóm tuổi (hoặc {@code all}). */
    private boolean ageHit(CustomerView customer, SegmentRule rule, LocalDate today) {
        List<String> buckets = rule.buckets() == null || rule.buckets().isEmpty()
                ? List.of(rule.bucket())
                : rule.buckets();
        if (buckets.contains(SegmentRules.ALL)) {
            return true;
        }
        return buckets.contains(AgeBucket.fromDob(customer.dob(), today).code());
    }

    /** Khớp nhãn RFM hiện tại của khách. */
    private boolean rfmHit(CustomerView customer, SegmentRule rule) {
        List<String> labels = rule.rfmSegments() == null || rule.rfmSegments().isEmpty()
                ? List.of(rule.rfmSegment())
                : rule.rfmSegments();
        if (labels.contains(SegmentRules.ALL)) {
            return true;
        }
        return labels.contains(rfm.rfmSegment(customer.id()));
    }

    /** Đã từng mua dòng thuộc danh mục trong rule. */
    private boolean boughtCategory(UUID userId, SegmentRule rule) {
        return orders.listDeliveredOrders(userId).stream()
                .flatMap(order -> order.lines().stream())
                .anyMatch(line -> categoryHit(line, rule));
    }

    /** So mã danh mục hoặc tên (không phân biệt hoa thường). */
    private static boolean categoryHit(DeliveredOrderLine line, SegmentRule rule) {
        if (rule.categoryId() != null && rule.categoryId().equals(line.categoryId())) {
            return true;
        }
        if (line.categoryName() == null) {
            return false;
        }
        String lineName = line.categoryName().trim();
        List<String> names = rule.categoryNames() == null ? List.of() : rule.categoryNames();
        for (String name : names) {
            if (name.equalsIgnoreCase(lineName)) {
                return true;
            }
        }
        return names.isEmpty()
                && rule.categoryName() != null
                && rule.categoryName().equalsIgnoreCase(lineName);
    }

    /** Mốc {@code addedAt} cũ để refresh không đẩy thành viên xuống cuối danh sách. */
    private Map<UUID, Instant> addedAtByUser(UUID segmentId) {
        Map<UUID, Instant> addedAt = new LinkedHashMap<>();
        for (SegmentMember member : store.membersOf(segmentId)) {
            addedAt.putIfAbsent(member.userId(), member.addedAt());
        }
        return addedAt;
    }

    /** Lấy phân khúc hoặc 404. */
    private CustomerSegment require(UUID segmentId) {
        return store.find(segmentId).orElseThrow(() -> new SegmentNotFoundException(segmentId));
    }

    /** Chặn sửa/xóa sáu phân khúc RFM có UUID cố định. */
    private void requireMutable(UUID segmentId) {
        boolean locked = RFM_DEFAULTS.stream().anyMatch(preset -> preset.id().equals(segmentId));
        if (locked) {
            throw new SegmentLockedException("Phân khúc mặc định theo nhãn RFM không được sửa hoặc xóa.");
        }
    }

    /** Một preset RFM hệ thống: UUID cố định, tên hiển thị, nhãn classifier. */
    private record RfmPreset(UUID id, String name, String label) {
        private RfmPreset(String id, String name, String label) {
            this(UUID.fromString(id), name, label);
        }
    }

    /** DTO phân khúc: rule JSON, thành viên, cờ khóa preset. */
    private SegmentResponse toResponse(CustomerSegment segment, List<SegmentMember> members) {
        List<SegmentMemberResponse> rows = new ArrayList<>();
        for (SegmentMember member : members) {
            CustomerView customer = identity.getCustomer(member.userId());
            rows.add(new SegmentMemberResponse(
                    member.userId(),
                    customer.fullName(),
                    customer.status(),
                    member.addedAt()));
        }
        return new SegmentResponse(
                segment.id(),
                segment.name(),
                SegmentRules.toDefinition(segment.rule()),
                rows.size(),
                List.copyOf(rows),
                segment.createdAt(),
                RFM_DEFAULTS.stream().anyMatch(preset -> preset.id().equals(segment.id())));
    }
}
