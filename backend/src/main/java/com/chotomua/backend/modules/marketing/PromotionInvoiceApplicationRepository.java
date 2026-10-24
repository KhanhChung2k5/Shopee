package com.chotomua.backend.modules.marketing;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** The invoice-level promotion applied to an order (promotion_invoice_applications). */
public interface PromotionInvoiceApplicationRepository extends JpaRepository<PromotionInvoiceApplication, UUID> {
    Optional<PromotionInvoiceApplication> findFirstByOrderId(UUID orderId);
}
