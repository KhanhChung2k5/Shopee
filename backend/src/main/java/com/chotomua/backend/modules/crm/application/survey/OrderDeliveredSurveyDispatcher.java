package com.chotomua.backend.modules.crm.application.survey;

import com.chotomua.backend.modules.crm.application.notification.NotificationStore;
import com.chotomua.backend.modules.crm.domain.notification.AppNotification;
import com.chotomua.backend.modules.crm.domain.survey.Survey;
import com.chotomua.backend.modules.crm.port.IdentityPort;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import com.chotomua.backend.modules.crm.web.dto.OrderDeliveredSurveyResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Hook đơn {@code delivered}: khớp sản phẩm mục tiêu → 1 thông báo khảo sát in-app.
 * Không SMTP. Chống trùng theo (surveyId, orderId) qua {@link SurveyDispatchLog} (lưu DB, giữ được qua restart).
 */
@Service
public class OrderDeliveredSurveyDispatcher {

    private final IdentityPort identity;
    private final OrderPort orders;
    private final SurveyStore surveys;
    private final SurveyTargetService targets;
    private final NotificationStore notifications;
    private final SurveyDispatchLog dispatchLog;
    private final Clock clock;

    @Autowired
    public OrderDeliveredSurveyDispatcher(
            IdentityPort identity,
            OrderPort orders,
            SurveyStore surveys,
            SurveyTargetService targets,
            NotificationStore notifications,
            SurveyDispatchLog dispatchLog
    ) {
        this(identity, orders, surveys, targets, notifications, dispatchLog, Clock.systemDefaultZone());
    }

    /** Kiểm thử gắn đồng hồ khi ghi thời điểm gửi. */
    OrderDeliveredSurveyDispatcher(
            IdentityPort identity,
            OrderPort orders,
            SurveyStore surveys,
            SurveyTargetService targets,
            NotificationStore notifications,
            SurveyDispatchLog dispatchLog,
            Clock clock
    ) {
        this.identity = identity;
        this.orders = orders;
        this.surveys = surveys;
        this.targets = targets;
        this.notifications = notifications;
        this.dispatchLog = dispatchLog;
        this.clock = clock;
    }

    /**
     * Gửi khảo sát in-app nếu đơn đã giao khớp sản phẩm mục tiêu và khách {@code active}.
     */
    public synchronized OrderDeliveredSurveyResponse dispatch(UUID actorId, UUID userId, UUID orderId) {
        identity.requireCrmStaff(actorId);
        return dispatchForDeliveredOrder(userId, orderId);
    }

    /**
     * Cùng logic nhưng không kiểm tra quyền — chỉ dành cho hệ thống gọi khi đơn chuyển
     * sang {@code delivered} (người giao đơn có thể là nhân viên kho, không phải CSKH).
     */
    public synchronized OrderDeliveredSurveyResponse dispatchForDeliveredOrder(UUID userId, UUID orderId) {
        CustomerView customer = identity.getCustomer(userId);
        Optional<DeliveredOrderView> delivered = orders.getDeliveredOrder(orderId);
        if (delivered.isEmpty() || !userId.equals(delivered.get().userId())) {
            return new OrderDeliveredSurveyResponse(orderId, userId, 0, List.of());
        }
        if (!CustomerStatus.ACTIVE.equals(customer.status())) {
            return new OrderDeliveredSurveyResponse(orderId, userId, 0, List.of());
        }
        Set<UUID> orderedProducts = new HashSet<>();
        for (DeliveredOrderLine line : delivered.get().lines()) {
            if (line.productId() != null) {
                orderedProducts.add(line.productId());
            }
        }
        Instant now = Instant.now(clock);
        List<AppNotification> created = new ArrayList<>();
        List<UUID> surveyIds = new ArrayList<>();
        for (Survey survey : surveys.findAll()) {
            if (!eligible(survey.status())) {
                continue;
            }
            if (!matches(survey.id(), orderedProducts)) {
                continue;
            }
            if (!dispatchLog.claim(survey.id(), orderId)) {
                continue;
            }
            markSentIfDraft(survey);
            created.add(new AppNotification(
                    UUID.randomUUID(),
                    userId,
                    "survey",
                    survey.id(),
                    "in_app",
                    inboxContent(survey),
                    "sent",
                    now));
            surveyIds.add(survey.id());
        }
        if (!created.isEmpty()) {
            notifications.append(created);
        }
        return new OrderDeliveredSurveyResponse(orderId, userId, created.size(), List.copyOf(surveyIds));
    }

    private boolean matches(UUID surveyId, Set<UUID> orderedProducts) {
        Set<UUID> targetIds = targets.resolveTargetProductIds(surveyId);
        if (targetIds.isEmpty() || orderedProducts.isEmpty()) {
            return false;
        }
        for (UUID productId : orderedProducts) {
            if (targetIds.contains(productId)) {
                return true;
            }
        }
        return false;
    }

    private void markSentIfDraft(Survey survey) {
        if (!Survey.DRAFT.equals(survey.status())) {
            return;
        }
        Survey sent = new Survey(
                survey.id(),
                survey.createdByEmployeeId(),
                survey.title(),
                survey.description(),
                Survey.SENT,
                survey.createdAt());
        surveys.save(sent, surveys.questionsOf(survey.id()));
    }

    private static boolean eligible(String status) {
        return Survey.DRAFT.equals(status) || Survey.SENT.equals(status);
    }

    private static String inboxContent(Survey survey) {
        String title = survey.title() == null ? "Khảo sát" : survey.title().trim();
        String description = survey.description() == null ? "" : survey.description().trim();
        String content = description.isEmpty() ? title : title + " — " + description;
        return content.length() > 500 ? content.substring(0, 500) : content;
    }
}
