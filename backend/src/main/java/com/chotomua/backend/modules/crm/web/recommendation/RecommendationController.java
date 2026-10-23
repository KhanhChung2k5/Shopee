package com.chotomua.backend.modules.crm.web.recommendation;

import com.chotomua.backend.modules.crm.application.recommendation.RecommendationService;
import com.chotomua.backend.modules.crm.web.CurrentActor;
import com.chotomua.backend.modules.crm.web.dto.RecommendationListResponse;
import com.chotomua.backend.modules.crm.web.dto.RecommendationPushRequest;
import com.chotomua.backend.modules.crm.web.dto.RecommendationPushResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Gợi ý sản phẩm theo hành vi mua. Nhân viên CRM xem mọi khách; khách chỉ xem của mình.
 * Đẩy hộp thư chỉ dành cho admin / CRM / CSKH.
 */
@RestController
public class RecommendationController {

    private final RecommendationService recommendations;
    private final CurrentActor currentActor;

    public RecommendationController(RecommendationService recommendations, CurrentActor currentActor) {
        this.recommendations = recommendations;
        this.currentActor = currentActor;
    }

    @GetMapping({
            "/api/crm/customers/{userId}/recommendations",
            "/api/customers/{userId}/recommendations"
    })
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS', 'ROLE_BUYER')")
    public RecommendationListResponse list(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return recommendations.list(currentActor.requireUserId(), userId, limit);
    }

    @PostMapping({
            "/api/crm/customers/{userId}/recommendations/notify",
            "/api/customers/{userId}/recommendations/notify"
    })
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public RecommendationPushResponse notifyCustomer(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "10") int limit,
            @RequestBody(required = false) RecommendationPushRequest body
    ) {
        List<UUID> productIds = body == null || body.productIds() == null ? List.of() : body.productIds();
        return recommendations.pushToCustomer(currentActor.requireUserId(), userId, limit, productIds);
    }
}
