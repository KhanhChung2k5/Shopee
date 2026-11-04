package com.chotomua.backend.modules.marketing;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    /** Uses counted against the voucher's total limit — a cancelled order gives its use back. */
    @Query(value = """
            SELECT COUNT(*) FROM voucher_usages vu
            JOIN orders o ON o.id = vu.order_id
            WHERE vu.voucher_id = :voucherId AND o.status <> 'cancelled'
            """, nativeQuery = true)
    long countActiveUses(@Param("voucherId") UUID voucherId);

    /** [voucher_id, uses] for every voucher used at least once by an order that is not cancelled. */
    @Query(value = """
            SELECT vu.voucher_id, COUNT(*) FROM voucher_usages vu
            JOIN orders o ON o.id = vu.order_id
            WHERE o.status <> 'cancelled'
            GROUP BY vu.voucher_id
            """, nativeQuery = true)
    List<Object[]> countActiveUsesByVoucher();

    default Map<UUID, Long> activeUsesByVoucher() {
        Map<UUID, Long> used = new HashMap<>();
        for (Object[] row : countActiveUsesByVoucher()) {
            UUID id = row[0] instanceof UUID uuid ? uuid : UUID.fromString(row[0].toString());
            used.put(id, ((Number) row[1]).longValue());
        }
        return used;
    }

    /** A "new customer" voucher is for a first order: any order not cancelled means the buyer is no longer new. */
    @Query(value = "SELECT EXISTS (SELECT 1 FROM orders WHERE user_id = :userId AND status <> 'cancelled')",
            nativeQuery = true)
    boolean hasPlacedOrder(@Param("userId") UUID userId);

    boolean existsByVoucherId(UUID voucherId);
}
