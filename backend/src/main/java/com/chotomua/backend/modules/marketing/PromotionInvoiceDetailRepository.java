package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionInvoiceDetailRepository extends JpaRepository<PromotionInvoiceDetail, UUID> {
    List<PromotionInvoiceDetail> findAllByOrderByPromotionProgramIdAsc();
    boolean existsByPromotionProgramId(UUID promotionProgramId);
}
