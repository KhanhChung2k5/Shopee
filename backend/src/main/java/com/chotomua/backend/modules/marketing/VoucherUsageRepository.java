package com.chotomua.backend.modules.marketing;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherUsageRepository extends JpaRepository<VoucherUsage, UUID> {

    /** Each buyer may use a voucher once; a use on an order that was later cancelled does not count. */
    @Query(value = """
            SELECT EXISTS (SELECT 1 FROM voucher_usages vu
                           JOIN orders o ON o.id = vu.order_id
                           WHERE vu.voucher_id = :voucherId AND vu.user_id = :userId
                             AND o.status <> 'cancelled')
            """, nativeQuery = true)
    boolean hasActiveUse(@Param("voucherId") UUID voucherId, @Param("userId") UUID userId);
}
