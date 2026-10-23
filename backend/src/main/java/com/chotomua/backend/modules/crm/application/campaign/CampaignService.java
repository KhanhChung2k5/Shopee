package com.chotomua.backend.modules.crm.application.campaign;

import com.chotomua.backend.modules.crm.application.exception.CampaignNotFoundException;
import com.chotomua.backend.modules.crm.application.exception.CrmForbiddenException;
import com.chotomua.backend.modules.crm.application.exception.CustomerNotFoundException;
import com.chotomua.backend.modules.crm.application.exception.InvalidCampaignException;
import com.chotomua.backend.modules.crm.application.exception.NotificationNotFoundException;
import com.chotomua.backend.modules.crm.application.exception.SegmentNotFoundException;
import com.chotomua.backend.modules.crm.application.notification.NotificationStore;
import com.chotomua.backend.modules.crm.application.segment.SegmentStore;
import com.chotomua.backend.modules.crm.application.survey.SurveyStore;
import com.chotomua.backend.modules.crm.domain.campaign.Campaign;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignTarget;
import com.chotomua.backend.modules.crm.domain.notification.AppNotification;
import com.chotomua.backend.modules.crm.domain.segment.SegmentMember;
import com.chotomua.backend.modules.crm.domain.survey.Survey;
import com.chotomua.backend.modules.crm.port.IdentityPort;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.web.dto.CampaignListResponse;
import com.chotomua.backend.modules.crm.web.dto.CampaignRecipientListResponse;
import com.chotomua.backend.modules.crm.web.dto.CampaignRecipientResponse;
import com.chotomua.backend.modules.crm.web.dto.CampaignResponse;
import com.chotomua.backend.modules.crm.web.dto.NotificationListResponse;
import com.chotomua.backend.modules.crm.web.dto.NotificationResponse;
import com.chotomua.backend.modules.crm.web.dto.SkippedRecipientResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Gửi chiến dịch trong ứng dụng: ghi {@code Campaign} + {@code CampaignTarget},
 * sinh {@code Notification} cho khách {@code active}. Bỏ {@code locked} và {@code deleted}.
 * Không gửi thư điện tử.
 */
@Service
public class CampaignService {

    public static final String CHANNEL_IN_APP = "in_app";
    public static final String REFERENCE_CAMPAIGN = "campaign";
    public static final String REFERENCE_SURVEY = "survey";
    public static final String STATUS_SENT = "sent";
    public static final String STATUS_READ = "read";
    public static final String STATUS_SCHEDULED = "scheduled";
    public static final String DELIVERY_SENT = "sent";
    public static final String DELIVERY_SCHEDULED = "scheduled";

    private final IdentityPort identity;
    private final OrderPort orders;
    private final ProductPort products;
    private final SegmentStore segments;
    private final CampaignStore campaigns;
    private final CampaignProductTargetStore productTargets;
    private final NotificationStore notifications;
    private final SurveyStore surveys;
    private final Clock clock;

    /** Spring tiêm cổng danh tính / đơn / sản phẩm và các kho in-app. */
    @Autowired
    public CampaignService(
            IdentityPort identity,
            OrderPort orders,
            ProductPort products,
            SegmentStore segments,
            CampaignStore campaigns,
            CampaignProductTargetStore productTargets,
            NotificationStore notifications,
            SurveyStore surveys
    ) {
        this(identity, orders, products, segments, campaigns, productTargets, notifications, surveys, Clock.systemDefaultZone());
    }

    /** Cho phép kiểm thử gắn {@link Clock} cố định. */
    CampaignService(
            IdentityPort identity,
            OrderPort orders,
            ProductPort products,
            SegmentStore segments,
            CampaignStore campaigns,
            CampaignProductTargetStore productTargets,
            NotificationStore notifications,
            SurveyStore surveys,
            Clock clock
    ) {
        this.identity = identity;
        this.orders = orders;
        this.products = products;
        this.segments = segments;
        this.campaigns = campaigns;
        this.productTargets = productTargets;
        this.notifications = notifications;
        this.surveys = surveys;
        this.clock = clock;
    }

    /** Danh sách chiến dịch cho nhân viên CRM; phát thư đến hạn trước khi đọc. */
    public CampaignListResponse list(UUID actorId) {
        dispatchDue();
        identity.requireMarketingStaff(actorId);
        List<CampaignResponse> rows = campaigns.findAll().stream()
                .map(this::toResponse)
                .toList();
        return new CampaignListResponse(rows);
    }

    /** Chi tiết một chiến dịch; 404 nếu không còn trong kho. */
    public CampaignResponse get(UUID actorId, UUID campaignId) {
        dispatchDue();
        identity.requireMarketingStaff(actorId);
        return toResponse(require(campaignId));
    }

    /** Trang người đã nhận thư. Mỗi lần tối đa 10 người. */
    public CampaignRecipientListResponse recipients(UUID actorId, UUID campaignId, int offset, int limit) {
        dispatchDue();
        identity.requireMarketingStaff(actorId);
        Campaign campaign = require(campaignId);
        Reference reference = referenceOf(campaign);
        boolean scheduled = notifications.countStatus(reference.type(), reference.id(), STATUS_SCHEDULED) > 0;
        String status = scheduled ? STATUS_SCHEDULED : STATUS_SENT;
        int pageSize = Math.min(Math.max(limit, 1), 10);
        int start = Math.max(offset, 0);
        int total = notifications.countStatus(reference.type(), reference.id(), status);
        List<CampaignRecipientResponse> rows = new ArrayList<>();
        for (AppNotification note : notifications.pageByStatus(reference.type(), reference.id(), status, start, pageSize)) {
            rows.add(new CampaignRecipientResponse(note.userId(), recipientName(note.userId()), note.status()));
        }
        return new CampaignRecipientListResponse(total, rows);
    }

    /**
     * Tạo chiến dịch in-app tới thành viên phân khúc hợp người đã mua sản phẩm mục tiêu.
     * {@code startAt} trong tương lai thì thư ở trạng thái lên lịch; khách không {@code active} bị bỏ qua.
     */
    public CampaignResponse send(
            UUID actorId,
            String name,
            List<UUID> segmentIds,
            String content,
            UUID surveyId,
            Instant startAt,
            Instant endAt,
            List<UUID> productIds,
            ProductFilter filter
    ) {
        identity.requireMarketingStaff(actorId);
        Instant now = Instant.now(clock);
        Instant start = startAt == null ? now : startAt;
        if (endAt != null && endAt.isBefore(start)) {
            throw new InvalidCampaignException("Thời điểm kết thúc phải sau thời điểm bắt đầu.");
        }
        List<UUID> uniqueSegments = distinctSegments(segmentIds);
        for (UUID segmentId : uniqueSegments) {
            if (segments.find(segmentId).isEmpty()) {
                throw new SegmentNotFoundException(segmentId);
            }
        }
        List<UUID> uniqueProducts = uniqueActiveProducts(productIds);
        ProductFilter storedFilter = emptyToNull(filter);
        boolean hasProductTarget = !uniqueProducts.isEmpty() || storedFilter != null;
        if (uniqueSegments.isEmpty() && !hasProductTarget) {
            throw new InvalidCampaignException("Chiến dịch cần ít nhất một phân khúc hoặc một sản phẩm mục tiêu.");
        }
        if (surveyId != null) {
            surveys.find(surveyId).ifPresent(survey -> {
                if (Survey.CLOSED.equals(survey.status())) {
                    throw new InvalidCampaignException("Phiếu đã lưu trữ, không gửi được.");
                }
            });
        }

        UUID campaignId = UUID.randomUUID();
        String referenceType = surveyId == null ? REFERENCE_CAMPAIGN : REFERENCE_SURVEY;
        UUID referenceId = surveyId == null ? campaignId : surveyId;
        Campaign campaign = new Campaign(
                campaignId,
                name.trim(),
                CHANNEL_IN_APP,
                start,
                endAt,
                surveyId);
        List<CampaignTarget> targets = uniqueSegments.stream()
                .map(segmentId -> new CampaignTarget(campaignId, segmentId))
                .toList();

        boolean later = start.isAfter(now);
        Set<UUID> resolvedProducts = resolveProductIds(uniqueProducts, storedFilter);
        Map<UUID, CustomerView> audience = audience(uniqueSegments, resolvedProducts);
        List<AppNotification> created = new ArrayList<>();
        List<SkippedRecipientResponse> skipped = new ArrayList<>();
        for (CustomerView customer : audience.values()) {
            if (!CustomerStatus.ACTIVE.equals(customer.status())) {
                skipped.add(new SkippedRecipientResponse(customer.id(), customer.fullName(), customer.status()));
                continue;
            }
            created.add(new AppNotification(
                    UUID.randomUUID(),
                    customer.id(),
                    referenceType,
                    referenceId,
                    CHANNEL_IN_APP,
                    content.trim(),
                    later ? STATUS_SCHEDULED : STATUS_SENT,
                    later ? start : now));
        }
        campaigns.save(campaign, targets);
        if (hasProductTarget) {
            productTargets.save(new CampaignProductTarget(campaignId, uniqueProducts, storedFilter));
        }
        notifications.append(created);
        if (!created.isEmpty()) {
            markSurveySent(surveyId);
        }
        return toResponse(campaign, later ? 0 : created.size(), skipped);
    }

    /** Phiếu có thật thì chuyển sang đã gửi. Mã khảo sát không tồn tại vẫn giữ thư (tương thích gửi thử). */
    private void markSurveySent(UUID surveyId) {
        if (surveyId == null) {
            return;
        }
        surveys.find(surveyId).ifPresent(current -> {
            if (Survey.SENT.equals(current.status()) || Survey.CLOSED.equals(current.status())) {
                return;
            }
            surveys.save(new Survey(
                    current.id(),
                    current.createdByEmployeeId(),
                    current.title(),
                    current.description(),
                    Survey.SENT,
                    current.createdAt()), surveys.questionsOf(current.id()));
        });
    }

    /** Sửa tên và nội dung thư đã nằm trong hộp thư. Không gửi thêm. */
    public CampaignResponse update(UUID actorId, UUID campaignId, String name, String content, Instant startAt) {
        dispatchDue();
        identity.requireMarketingStaff(actorId);
        Campaign current = require(campaignId);
        Instant nextStart = startAt == null ? current.startAt() : startAt;
        if (current.endAt() != null && current.endAt().isBefore(nextStart)) {
            throw new InvalidCampaignException("Thời điểm kết thúc phải sau thời điểm bắt đầu.");
        }
        Reference reference = referenceOf(current);
        boolean scheduled = notifications.countStatus(reference.type(), reference.id(), STATUS_SCHEDULED) > 0;
        if (startAt != null && !startAt.equals(current.startAt()) && !scheduled) {
            throw new InvalidCampaignException("Chiến dịch đã gửi, không đổi được lịch.");
        }
        Campaign renamed = new Campaign(
                current.id(),
                name.trim(),
                current.channel(),
                nextStart,
                current.endAt(),
                current.surveyId());
        campaigns.save(renamed, campaigns.targetsOf(current.id()));
        notifications.updateContent(reference.type(), reference.id(), content.trim());
        if (startAt != null && scheduled) {
            notifications.reschedule(reference.type(), reference.id(), startAt);
            dispatchDue();
        }
        return toResponse(renamed);
    }

    /** Xóa chiến dịch và thông báo in-app đã sinh cho lượt gửi đó. */
    public void delete(UUID actorId, UUID campaignId) {
        identity.requireMarketingStaff(actorId);
        Campaign current = require(campaignId);
        Reference reference = referenceOf(current);
        notifications.deleteByReference(reference.type(), reference.id());
        productTargets.delete(campaignId);
        campaigns.delete(campaignId);
    }

    /**
     * Hộp thư của người đang đăng nhập.
     * Nhân viên CRM được xem hộp thư một khách khi truyền {@code userId}.
     */
    public NotificationListResponse inbox(UUID actorId, UUID requestedUserId) {
        dispatchDue();
        UUID target = requestedUserId == null ? actorId : requestedUserId;
        if (!target.equals(actorId)) {
            identity.requireMarketingStaff(actorId);
        }
        List<NotificationResponse> rows = notifications.findByUser(target).stream()
                .filter(row -> STATUS_SENT.equals(row.status()) || STATUS_READ.equals(row.status()))
                .map(CampaignService::toNotification)
                .toList();
        return new NotificationListResponse(rows);
    }

    /**
     * Khách mở thư của chính mình: {@code sent} thành {@code read}.
     * Thư đã đọc giữ nguyên. Nhân viên CRM không đánh dấu hộp thư khách.
     */
    public NotificationResponse markRead(UUID actorId, UUID notificationId) {
        AppNotification note = notifications.find(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));
        if (!actorId.equals(note.userId())) {
            throw new CrmForbiddenException("Bạn không được mở thư của người khác.");
        }
        if (STATUS_SCHEDULED.equals(note.status())) {
            throw new InvalidCampaignException("Thư chưa được phát vào hộp thư.");
        }
        if (!STATUS_READ.equals(note.status())) {
            notifications.markRead(note.id());
            note = notifications.find(note.id()).orElseThrow(() -> new NotificationNotFoundException(notificationId));
        }
        return toNotification(note);
    }

    /** Phát các thư đã đến giờ. Khách vừa khóa hoặc xóa thì bỏ, không đưa vào hộp thư. */
    public void dispatchDue() {
        Instant now = Instant.now(clock);
        for (AppNotification row : notifications.findScheduledDue(now)) {
            if (!stillActive(row.userId())) {
                notifications.deleteById(row.id());
                continue;
            }
            notifications.markSent(row.id(), now);
        }
    }

    /**
     * Audience = thành viên phân khúc ∪ người đã mua sản phẩm mục tiêu.
     * Mỗi người một lần; bỏ hồ sơ không còn trên cổng danh tính.
     */
    private Map<UUID, CustomerView> audience(List<UUID> segmentIds, Set<UUID> productIds) {
        Map<UUID, CustomerView> people = new LinkedHashMap<>();
        for (UUID segmentId : segmentIds) {
            for (SegmentMember member : segments.membersOf(segmentId)) {
                putCustomer(people, member.userId());
            }
        }
        if (!productIds.isEmpty()) {
            for (UUID buyerId : orders.findBuyersOfProducts(productIds)) {
                putCustomer(people, buyerId);
            }
        }
        return people;
    }

    private void putCustomer(Map<UUID, CustomerView> people, UUID userId) {
        if (people.containsKey(userId)) {
            return;
        }
        try {
            people.put(userId, identity.getCustomer(userId));
        } catch (CustomerNotFoundException ignored) {
            // Thành viên / người mua không còn trên cổng danh tính — bỏ qua, không gửi.
        }
    }

    /** Loại trùng phân khúc; danh sách trống thì không dùng segment. */
    private static List<UUID> distinctSegments(List<UUID> segmentIds) {
        if (segmentIds == null || segmentIds.isEmpty()) {
            return List.of();
        }
        return List.copyOf(new LinkedHashSet<>(segmentIds));
    }

    private List<UUID> uniqueActiveProducts(List<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> unique = new LinkedHashSet<>();
        for (UUID productId : productIds) {
            if (productId == null) {
                continue;
            }
            if (!products.existsActive(productId)) {
                throw new InvalidCampaignException("Sản phẩm không tồn tại hoặc đã ngừng bán: " + productId);
            }
            unique.add(productId);
        }
        return List.copyOf(unique);
    }

    private Set<UUID> resolveProductIds(List<UUID> productIds, ProductFilter filter) {
        Set<UUID> ids = new LinkedHashSet<>(productIds);
        if (filter != null && !filter.isUnconstrained()) {
            for (ProductView product : products.search(filter)) {
                ids.add(product.id());
            }
        }
        return ids;
    }

    private static ProductFilter emptyToNull(ProductFilter filter) {
        if (filter == null || filter.isUnconstrained()) {
            return null;
        }
        return filter;
    }

    /** Lấy chiến dịch hoặc ném 404. */
    private Campaign require(UUID campaignId) {
        return campaigns.find(campaignId).orElseThrow(() -> new CampaignNotFoundException(campaignId));
    }

    /** Đóng gói chiến dịch kèm số thư đã sinh và nội dung hộp thư. */
    private CampaignResponse toResponse(Campaign campaign) {
        Reference reference = referenceOf(campaign);
        int sentCount = notifications.countByReference(reference.type(), reference.id());
        return toResponse(campaign, sentCount, List.of());
    }

    /** Bản DTO đầy đủ: phân khúc đích, số gửi, người bị bỏ, trạng thái giao. */
    private CampaignResponse toResponse(Campaign campaign, int sentCount, List<SkippedRecipientResponse> skipped) {
        List<UUID> segmentIds = campaigns.targetsOf(campaign.id()).stream()
                .map(CampaignTarget::segmentId)
                .toList();
        Reference reference = referenceOf(campaign);
        CampaignProductTarget productTarget = productTargets.find(campaign.id()).orElse(null);
        return new CampaignResponse(
                campaign.id(),
                campaign.name(),
                campaign.channel(),
                campaign.startAt(),
                campaign.endAt(),
                segmentIds,
                reference.type(),
                reference.id(),
                sentCount,
                notifications.countStatus(reference.type(), reference.id(), STATUS_READ),
                List.copyOf(skipped),
                notifications.contentOf(reference.type(), reference.id()),
                notifications.countStatus(reference.type(), reference.id(), STATUS_SCHEDULED) > 0
                        ? DELIVERY_SCHEDULED
                        : DELIVERY_SENT,
                productTarget == null ? List.of() : productTarget.productIds(),
                productTarget == null ? null : productTarget.filter());
    }

    /** Tên khách trên cổng danh tính; mất hồ sơ thì hiện “Không rõ”. */
    private String recipientName(UUID userId) {
        try {
            return identity.getCustomer(userId).fullName();
        } catch (CustomerNotFoundException ignored) {
            return "Không rõ";
        }
    }

    /** Còn {@code active} thì mới được phát thư đã lên lịch. */
    private boolean stillActive(UUID userId) {
        try {
            return CustomerStatus.ACTIVE.equals(identity.getCustomer(userId).status());
        } catch (CustomerNotFoundException ignored) {
            return false;
        }
    }

    /** Khóa tham chiếu thông báo: khảo sát nếu gắn phiếu, không thì chính chiến dịch. */
    private static Reference referenceOf(Campaign campaign) {
        if (campaign.surveyId() == null) {
            return new Reference(REFERENCE_CAMPAIGN, campaign.id());
        }
        return new Reference(REFERENCE_SURVEY, campaign.surveyId());
    }

    /** Loại và mã đối tượng mà thông báo trỏ tới (chiến dịch hoặc khảo sát). */
    private record Reference(String type, UUID id) {
    }

    /** Ánh xạ bản ghi hộp thư sang DTO REST. */
    private static NotificationResponse toNotification(AppNotification notification) {
        return new NotificationResponse(
                notification.id(),
                notification.userId(),
                notification.referenceType(),
                notification.referenceId(),
                notification.channel(),
                notification.content(),
                notification.status(),
                notification.sentAt());
    }
}
