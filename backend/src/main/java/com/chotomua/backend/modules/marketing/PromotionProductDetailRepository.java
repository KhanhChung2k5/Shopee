package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface PromotionProductDetailRepository extends JpaRepository<PromotionProductDetail, UUID> {
    List<PromotionProductDetail> findAllByOrderByPromotionProgramIdAscVariantIdAsc();
    List<PromotionProductDetail> findByPromotionProgramIdAndVariantId(UUID promotionProgramId, UUID variantId);
    boolean existsByPromotionProgramId(UUID promotionProgramId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<PromotionProductDetail> findByVariantId(UUID variantId);

    /** Same rows without the write lock — for checkout previews that change nothing. */
    List<PromotionProductDetail> readByVariantId(UUID variantId);
}
