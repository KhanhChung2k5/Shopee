package com.chotomua.backend.modules.crm.web.survey;

import com.chotomua.backend.modules.crm.application.survey.OrderDeliveredSurveyDispatcher;
import com.chotomua.backend.modules.crm.web.CurrentActor;
import com.chotomua.backend.modules.crm.web.dto.OrderDeliveredSurveyResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Hook thủ công/demo: đơn {@code delivered} → gửi khảo sát in-app nếu khớp sản phẩm.
 * Quyền nhân viên CRM (admin / crm / cs). Không SMTP.
 */
@RestController
@RequestMapping("/api/crm/orders")
@PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
public class OrderDeliveredHookController {

    private final OrderDeliveredSurveyDispatcher dispatcher;
    private final CurrentActor currentActor;

    public OrderDeliveredHookController(
            OrderDeliveredSurveyDispatcher dispatcher,
            CurrentActor currentActor
    ) {
        this.dispatcher = dispatcher;
        this.currentActor = currentActor;
    }

    @PostMapping("/{orderId}/delivered")
    public OrderDeliveredSurveyResponse delivered(
            @PathVariable UUID orderId,
            @RequestParam UUID userId
    ) {
        return dispatcher.dispatch(currentActor.requireUserId(), userId, orderId);
    }
}
