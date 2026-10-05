package com.chototmua.crm.application.campaign;

import com.chototmua.crm.application.exception.CampaignNotFoundException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidCampaignException;
import com.chototmua.crm.application.exception.SegmentNotFoundException;
import com.chototmua.crm.application.notification.NotificationStore;
import com.chototmua.crm.application.segment.SegmentStore;
import com.chototmua.crm.application.survey.SurveyStore;
import com.chototmua.crm.domain.campaign.Campaign;
import com.chototmua.crm.domain.campaign.CampaignTarget;
import com.chototmua.crm.domain.notification.AppNotification;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.web.dto.CampaignListResponse;
import com.chototmua.crm.web.dto.CampaignRecipientListResponse;
import com.chototmua.crm.web.dto.CampaignRecipientResponse;
import com.chototmua.crm.web.dto.CampaignResponse;
import com.chototmua.crm.web.dto.NotificationListResponse;
import com.chototmua.crm.web.dto.NotificationResponse;
import com.chototmua.crm.web.dto.SkippedRecipientResponse;
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
    public static final String STATUS_SCHEDULED = "scheduled";
    public static final String DELIVERY_SENT = "sent";
    public static final String DELIVERY_SCHEDULED = "scheduled";

    private final IdentityPort identity;
    private final SegmentStore segments;
    private final CampaignStore campaigns;
    private final NotificationStore notifications;
    private final SurveyStore surveys;
    private final Clock clock;

    /** Spring tiêm cổng danh tính, kho phân khúc / chiến dịch / thông báo / khảo sát. */
    @Autowired
    public CampaignService(
            IdentityPort identity,
            SegmentStore segments,
            CampaignStore campaigns,
            NotificationStore notifications,
            SurveyStore surveys
    ) {
        this(identity, segments, campaigns, notifications, surveys, Clock.systemDefaultZone());
    }

    /** Cho phép kiểm thử gắn {@link Clock} cố định. */
    CampaignService(
            IdentityPort identity,
            SegmentStore segments,
            CampaignStore campaigns,
            NotificationStore notifications,
            SurveyStore surveys,
            Clock clock
    ) {
        this.identity = identity;
        this.segments = segments;
        this.campaigns = campaigns;
        this.notifications = notifications;
        this.surveys = surveys;
        this.clock = clock;
    }

    /** Danh sách chiến dịch cho nhân viên CRM; phát thư đến hạn trước khi đọc. */
    public CampaignListResponse list(UUID actorId) {
        dispatchDue();
        identity.requireCrmStaff(actorId);
        List<CampaignResponse> rows = campaigns.findAll().stream()
                .map(this::toResponse)
                .toList();
        return new CampaignListResponse(rows);
    }

    /** Chi tiết một chiến dịch; 404 nếu không còn trong kho. */
    public CampaignResponse get(UUID actorId, UUID campaignId) {
        dispatchDue();
        identity.requireCrmStaff(actorId);
        return toResponse(require(campaignId));
    }

    /** Trang người đã nhận thư. Mỗi lần tối đa 10 người. */
    public CampaignRecipientListResponse recipients(UUID actorId, UUID campaignId, int offset, int limit) {
        dispatchDue();
        identity.requireCrmStaff(actorId);
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
     * Tạo chiến dịch in-app tới thành viên phân khúc.
     * {@code startAt} trong tương lai thì thư ở trạng thái lên lịch; khách không {@code active} bị bỏ qua.
     */
    public CampaignResponse send(
            UUID actorId,
            String name,
            List<UUID> segmentIds,
            String content,
            UUID surveyId,
            Instant startAt,
            Instant endAt
    ) {
        identity.requireCrmStaff(actorId);
        Instant now = Instant.now(clock);
        Instant start = startAt == null ? now : startAt;
        if (endAt != null && endAt.isBefore(start)) {
            throw new InvalidCampaignException("Thời điểm kết thúc phải sau thời điểm bắt đầu.");
        }
        List<UUID> uniqueSegments = distinct(segmentIds);
        for (UUID segmentId : uniqueSegments) {
            if (segments.find(segmentId).isEmpty()) {
                throw new SegmentNotFoundException(segmentId);
            }
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
        Map<UUID, CustomerView> audience = audience(uniqueSegments);
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
        identity.requireCrmStaff(actorId);
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
        identity.requireCrmStaff(actorId);
        Campaign current = require(campaignId);
        Reference reference = referenceOf(current);
        notifications.deleteByReference(reference.type(), reference.id());
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
            identity.requireCrmStaff(actorId);
        }
        List<NotificationResponse> rows = notifications.findByUser(target).stream()
                .filter(row -> STATUS_SENT.equals(row.status()) || "read".equals(row.status()))
                .map(CampaignService::toNotification)
                .toList();
        return new NotificationListResponse(rows);
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

    /** Gộp khách từ các phân khúc, mỗi người một lần; bỏ thành viên không còn trên cổng danh tính. */
    private Map<UUID, CustomerView> audience(List<UUID> segmentIds) {
        Map<UUID, CustomerView> people = new LinkedHashMap<>();
        for (UUID segmentId : segmentIds) {
            for (SegmentMember member : segments.membersOf(segmentId)) {
                if (people.containsKey(member.userId())) {
                    continue;
                }
                try {
                    people.put(member.userId(), identity.getCustomer(member.userId()));
                } catch (CustomerNotFoundException ignored) {
                    // Thành viên cũ không còn trên cổng danh tính — bỏ qua, không gửi.
                }
            }
        }
        return people;
    }

    /** Loại trùng phân khúc; thiếu ít nhất một phân khúc thì 422. */
    private static List<UUID> distinct(List<UUID> segmentIds) {
        Set<UUID> unique = new LinkedHashSet<>(segmentIds);
        if (unique.isEmpty()) {
            throw new InvalidCampaignException("Chiến dịch cần ít nhất một phân khúc.");
        }
        return List.copyOf(unique);
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
                List.copyOf(skipped),
                notifications.contentOf(reference.type(), reference.id()),
                notifications.countStatus(reference.type(), reference.id(), STATUS_SCHEDULED) > 0
                        ? DELIVERY_SCHEDULED
                        : DELIVERY_SENT);
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
