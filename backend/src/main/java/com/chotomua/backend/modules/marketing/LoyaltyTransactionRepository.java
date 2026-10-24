package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, UUID> {
    List<LoyaltyTransaction> findByUserIdOrderByCreatedAtDescIdDesc(UUID userId);
    boolean existsByOrderId(UUID orderId);

    /**
     * Lifetime points earned — what the membership tier is ranked on. Points are never spent today; the only
     * negative rows take back points for refunded (returned) goods, so they count against what was earned.
     */
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(t.points), 0) from LoyaltyTransaction t where t.userId = :userId")
    long sumEarnedPoints(@org.springframework.data.repository.query.Param("userId") UUID userId);

    /** Points an order still holds (awarded on delivery minus any taken back for refunds). */
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(t.points), 0) from LoyaltyTransaction t where t.orderId = :orderId")
    long sumPointsForOrder(@org.springframework.data.repository.query.Param("orderId") UUID orderId);
}
