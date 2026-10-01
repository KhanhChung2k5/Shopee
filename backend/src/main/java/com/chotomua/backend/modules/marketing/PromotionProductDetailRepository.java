package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionProductDetailRepository extends JpaRepository<PromotionProductDetail, UUID> {
    List<PromotionProductDetail> findAllByOrderByPromotionProgramIdAscVariantIdAsc();
    List<PromotionProductDetail> findByPromotionProgramIdAndVariantId(UUID promotionProgramId, UUID variantId);
    boolean existsByPromotionProgramId(UUID promotionProgramId);
}
