package com.chotomua.backend.modules.marketing;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Which SKU promotion priced each order line (promotion_product_applications). */
public interface PromotionProductApplicationRepository extends JpaRepository<PromotionProductApplication, UUID> {
    List<PromotionProductApplication> findByOrderItemIdIn(Collection<UUID> orderItemIds);
}
