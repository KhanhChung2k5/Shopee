package com.chotomua.backend.modules.crm.application;

import com.chotomua.backend.modules.crm.application.profile.CustomerProfileService;
import com.chotomua.backend.modules.crm.application.survey.OrderDeliveredSurveyDispatcher;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Cầu nối từ phân hệ đơn hàng sang CRM (task p5-09): khi đơn chuyển sang {@code delivered},
 * tính lại hồ sơ CRM (LTV / RFM) và gửi khảo sát NPS in-app cho khách.
 *
 * Chạy sau khi giao dịch của đơn đã commit, và nuốt lỗi: CRM hỏng không được làm hỏng
 * việc cập nhật trạng thái giao hàng.
 */
@Service
public class CrmOrderEvents {

    private static final Logger log = LoggerFactory.getLogger(CrmOrderEvents.class);

    private final CustomerProfileService profiles;
    private final OrderDeliveredSurveyDispatcher surveys;

    public CrmOrderEvents(CustomerProfileService profiles, OrderDeliveredSurveyDispatcher surveys) {
        this.profiles = profiles;
        this.surveys = surveys;
    }

    public void onOrderDelivered(UUID userId, UUID orderId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    handleDelivered(userId, orderId);
                }
            });
        } else {
            handleDelivered(userId, orderId);
        }
    }

    private void handleDelivered(UUID userId, UUID orderId) {
        try {
            profiles.recalculate(userId);
            surveys.dispatchForDeliveredOrder(userId, orderId);
        } catch (RuntimeException e) {
            log.warn("CRM hook failed for delivered order {} (user {})", orderId, userId, e);
        }
    }
}
