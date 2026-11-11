package com.chototmua.crm.application.report;

import com.chototmua.crm.domain.profile.LifetimeValue;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.web.dto.CustomerReportResponse;
import com.chototmua.crm.web.dto.InterestBucket;
import com.chototmua.crm.web.dto.ReportBucket;
import com.chototmua.crm.web.dto.ReportCustomer;
import com.chototmua.crm.web.dto.ReportFact;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Báo cáo nhân khẩu từ OLTP qua cổng. Không ClickHouse, không bảng hobby, không fact_*.
 */
@Service
public class CustomerReportService {

    private final IdentityPort identity;
    private final OrderPort orders;
    private final Clock clock;

    @Autowired
    public CustomerReportService(IdentityPort identity, OrderPort orders) {
        this(identity, orders, Clock.systemDefaultZone());
    }

    /** Kiểm thử gắn đồng hồ khi tính recency. */
    CustomerReportService(IdentityPort identity, OrderPort orders, Clock clock) {
        this.identity = identity;
        this.orders = orders;
        this.clock = clock;
    }

    /** Câu chuyện 5: quản trị, quản lý CRM và CSKH được xem. */
    public CustomerReportResponse build(UUID actorId) {
        identity.requireCrmStaff(actorId);
        List<CustomerView> customers = identity.findCustomers(new CustomerFilter(null, null), false);
        LocalDate today = LocalDate.now(clock);
        List<DeliveredOrderLine> lines = new ArrayList<>();
        List<ReportFact> facts = new ArrayList<>();
        List<ReportCustomer> rows = new ArrayList<>();
        for (CustomerView customer : customers) {
            AgeBucket age = AgeBucket.fromDob(customer.dob(), today);
            GenderBucket gender = GenderBucket.fromGender(customer.gender());
            List<DeliveredOrderView> delivered = orders.listDeliveredOrders(customer.id());
            if (delivered == null) {
                delivered = List.of();
            }
            LifetimeValue.Snapshot value = LifetimeValue.snapshot(delivered, clock);
            List<DeliveredOrderLine> customerLines = new ArrayList<>();
            for (DeliveredOrderView order : delivered) {
                if (order.lines() != null) {
                    customerLines.addAll(order.lines());
                }
            }
            rows.add(new ReportCustomer(
                    customer.id(),
                    customer.fullName(),
                    age.code(),
                    age.label(),
                    gender.code(),
                    gender.label(),
                    value.ltv(),
                    delivered.size(),
                    RfmClassifier.segment(
                            daysSince(value.lastPurchaseAt()),
                            delivered.size(),
                            value.historicalSpend())));
            if (customerLines.isEmpty()) {
                facts.add(new ReportFact(
                        customer.id(), age.code(), age.label(), gender.code(), gender.label(),
                        null, null, null));
                continue;
            }
            for (DeliveredOrderLine line : customerLines) {
                lines.add(line);
                boolean hasCategory = line.categoryId() != null
                        || (line.categoryName() != null && !line.categoryName().isBlank());
                facts.add(new ReportFact(
                        customer.id(),
                        age.code(),
                        age.label(),
                        gender.code(),
                        gender.label(),
                        hasCategory ? line.categoryId() : null,
                        hasCategory ? displayName(line) : null,
                        normalizeGenre(line.genre())));
            }
        }
        rows.sort(Comparator
                .comparing(ReportCustomer::ltv, Comparator.nullsFirst(Comparator.naturalOrder()))
                .reversed()
                .thenComparing(ReportCustomer::fullName, String.CASE_INSENSITIVE_ORDER));
        return new CustomerReportResponse(
                customers.size(),
                ageBuckets(customers, today),
                genderBuckets(customers),
                interestBuckets(lines),
                genreBuckets(lines),
                List.copyOf(facts),
                List.copyOf(rows));
    }

    /** Cùng cách đếm ngày với hồ sơ CRM: chưa mua thì {@code null}. */
    private Integer daysSince(Instant lastPurchaseAt) {
        if (lastPurchaseAt == null) {
            return null;
        }
        long days = ChronoUnit.DAYS.between(lastPurchaseAt, Instant.now(clock));
        return (int) Math.max(days, 0);
    }

    /** Phân bố số khách theo nhóm tuổi đề bài. */
    private static List<ReportBucket> ageBuckets(List<CustomerView> customers, LocalDate today) {
        EnumMap<AgeBucket, Long> counts = new EnumMap<>(AgeBucket.class);
        for (AgeBucket bucket : AgeBucket.values()) {
            counts.put(bucket, 0L);
        }
        for (CustomerView customer : customers) {
            AgeBucket bucket = AgeBucket.fromDob(customer.dob(), today);
            increment(counts, bucket);
        }
        long total = customers.size();
        List<ReportBucket> result = new ArrayList<>();
        for (AgeBucket bucket : AgeBucket.values()) {
            long count = counts.get(bucket);
            result.add(new ReportBucket(bucket.code(), bucket.label(), count, percent(count, total)));
        }
        return List.copyOf(result);
    }

    /** Phân bố số khách theo nam / nữ / không rõ. */
    private static List<ReportBucket> genderBuckets(List<CustomerView> customers) {
        EnumMap<GenderBucket, Long> counts = new EnumMap<>(GenderBucket.class);
        for (GenderBucket bucket : GenderBucket.values()) {
            counts.put(bucket, 0L);
        }
        for (CustomerView customer : customers) {
            GenderBucket bucket = GenderBucket.fromGender(customer.gender());
            increment(counts, bucket);
        }
        long total = customers.size();
        List<ReportBucket> result = new ArrayList<>();
        for (GenderBucket bucket : GenderBucket.values()) {
            long count = counts.get(bucket);
            result.add(new ReportBucket(bucket.code(), bucket.label(), count, percent(count, total)));
        }
        return List.copyOf(result);
    }

    /** Sở thích theo danh mục trên dòng đơn đã giao (tỷ lệ trên số dòng có danh mục). */
    private static List<InterestBucket> interestBuckets(List<DeliveredOrderLine> lines) {
        Map<UUID, InterestTally> tallies = new LinkedHashMap<>();
        long totalLines = 0;
        for (DeliveredOrderLine line : lines) {
            if (line.categoryId() == null && (line.categoryName() == null || line.categoryName().isBlank())) {
                continue;
            }
            UUID key = line.categoryId() != null
                    ? line.categoryId()
                    : UUID.nameUUIDFromBytes(line.categoryName().getBytes());
            InterestTally tally = tallies.computeIfAbsent(
                    key, ignored -> new InterestTally(line.categoryId(), displayName(line)));
            tally.count += 1;
            totalLines += 1;
        }
        long finalTotal = totalLines;
        return tallies.values().stream()
                .sorted(Comparator
                        .comparingLong((InterestTally tally) -> tally.count).reversed()
                        .thenComparing(tally -> tally.categoryName, String.CASE_INSENSITIVE_ORDER))
                .map(tally -> new InterestBucket(
                        tally.categoryId,
                        tally.categoryName,
                        tally.count,
                        percent(tally.count, finalTotal)))
                .toList();
    }

    /** Thể loại chỉ có trên đĩa game. Tay cầm / phụ kiện (genre trống) không vào mẫu số. */
    private static List<ReportBucket> genreBuckets(List<DeliveredOrderLine> lines) {
        Map<String, Long> counts = new LinkedHashMap<>();
        long total = 0;
        for (DeliveredOrderLine line : lines) {
            String genre = normalizeGenre(line.genre());
            if (genre == null) {
                continue;
            }
            counts.merge(genre, 1L, Long::sum);
            total += 1;
        }
        long finalTotal = total;
        return counts.entrySet().stream()
                .sorted(Comparator
                        .comparingLong((Map.Entry<String, Long> entry) -> entry.getValue()).reversed()
                        .thenComparing(Map.Entry::getKey, String.CASE_INSENSITIVE_ORDER))
                .map(entry -> new ReportBucket(
                        entry.getKey(),
                        entry.getKey(),
                        entry.getValue(),
                        percent(entry.getValue(), finalTotal)))
                .toList();
    }

    /** Chuẩn hóa thể loại; trống → không đếm. */
    private static String normalizeGenre(String genre) {
        if (genre == null || genre.isBlank()) {
            return null;
        }
        return genre.trim();
    }

    /** Tăng bộ đếm enum một đơn vị. */
    private static <K extends Enum<K>> void increment(EnumMap<K, Long> counts, K bucket) {
        long current = counts.getOrDefault(bucket, 0L);
        counts.put(bucket, current + 1L);
    }

    /** Tên danh mục trên báo cáo; thiếu thì “Không rõ”. */
    private static String displayName(DeliveredOrderLine line) {
        if (line.categoryName() == null || line.categoryName().isBlank()) {
            return "Không rõ";
        }
        return line.categoryName();
    }

    /** Phần trăm làm tròn 2 chữ số; mẫu số 0 → 0. */
    static BigDecimal percent(long count, long total) {
        if (total <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return BigDecimal.valueOf(count)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    /** Bộ đếm tạm theo danh mục khi gom interest. */
    private static final class InterestTally {
        private final UUID categoryId;
        private final String categoryName;
        private long count;

        private InterestTally(UUID categoryId, String categoryName) {
            this.categoryId = categoryId;
            this.categoryName = categoryName;
        }
    }
}
