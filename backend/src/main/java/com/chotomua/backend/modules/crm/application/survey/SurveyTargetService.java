package com.chotomua.backend.modules.crm.application.survey;

import com.chotomua.backend.modules.crm.application.exception.InvalidSurveyException;
import com.chotomua.backend.modules.crm.application.exception.SurveyNotFoundException;
import com.chotomua.backend.modules.crm.domain.survey.Survey;
import com.chotomua.backend.modules.crm.domain.survey.SurveyProductTarget;
import com.chotomua.backend.modules.crm.port.IdentityPort;
import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.web.dto.SurveyProductTargetResponse;

import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Gắn sản phẩm vào khảo sát và resolve tập mục tiêu = productIds ∪ search(filter).
 */
@Service
public class SurveyTargetService {

    private final IdentityPort identity;
    private final ProductPort products;
    private final SurveyStore surveys;
    private final SurveyTargetStore targets;

    public SurveyTargetService(
            IdentityPort identity,
            ProductPort products,
            SurveyStore surveys,
            SurveyTargetStore targets
    ) {
        this.identity = identity;
        this.products = products;
        this.surveys = surveys;
        this.targets = targets;
    }

    /** Lưu danh sách cụ thể và/hoặc bộ lọc. */
    public SurveyProductTargetResponse set(UUID actorId, UUID surveyId, List<UUID> productIds, ProductFilter filter) {
        identity.requireCrmStaff(actorId);
        Survey survey = require(surveyId);
        if (Survey.CLOSED.equals(survey.status())) {
            throw new InvalidSurveyException("Phiếu đã lưu trữ, không gắn sản phẩm được.");
        }
        List<UUID> unique = uniqueActive(productIds);
        SurveyProductTarget saved = new SurveyProductTarget(surveyId, unique, emptyToNull(filter));
        targets.save(saved);
        return toResponse(saved);
    }

    /** Đọc lại target đã lưu; chưa gắn thì danh sách trống. */
    public SurveyProductTargetResponse get(UUID actorId, UUID surveyId) {
        identity.requireCrmStaff(actorId);
        require(surveyId);
        return targets.find(surveyId)
                .map(this::toResponse)
                .orElseGet(() -> new SurveyProductTargetResponse(surveyId, List.of(), null, List.of()));
    }

    /**
     * Tập sản phẩm mục tiêu = id chỉ định ∪ kết quả {@link ProductPort#search}.
     * Không có target thì empty.
     */
    public Set<UUID> resolveTargetProductIds(UUID surveyId) {
        return targets.find(surveyId)
                .map(this::resolve)
                .orElse(Set.of());
    }

    private Set<UUID> resolve(SurveyProductTarget target) {
        Set<UUID> ids = new LinkedHashSet<>(target.productIds());
        ProductFilter filter = target.filter();
        if (filter != null && !filter.isUnconstrained()) {
            for (ProductView product : products.search(filter)) {
                ids.add(product.id());
            }
        }
        return ids;
    }

    private List<UUID> uniqueActive(List<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> unique = new LinkedHashSet<>();
        for (UUID productId : productIds) {
            if (productId == null) {
                continue;
            }
            if (!products.existsActive(productId)) {
                throw new InvalidSurveyException("Sản phẩm không tồn tại hoặc đã ngừng bán: " + productId);
            }
            unique.add(productId);
        }
        return List.copyOf(unique);
    }

    private Survey require(UUID surveyId) {
        return surveys.find(surveyId).orElseThrow(() -> new SurveyNotFoundException(surveyId));
    }

    private SurveyProductTargetResponse toResponse(SurveyProductTarget target) {
        return new SurveyProductTargetResponse(
                target.surveyId(),
                target.productIds(),
                target.filter(),
                List.copyOf(resolve(target)));
    }

    private static ProductFilter emptyToNull(ProductFilter filter) {
        if (filter == null || filter.isUnconstrained()) {
            return null;
        }
        return filter;
    }
}
