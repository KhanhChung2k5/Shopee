package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    /** Open bank-transfer orders whose money never arrived, placed before the cutoff. */
    @org.springframework.data.jpa.repository.Query("""
            select o.id from Order o, Payment p
            where p.orderId = o.id and p.purpose = 'checkout' and p.method = 'bank_transfer' and p.status = 'pending'
              and o.status in ('pending', 'confirmed', 'cancel_requested') and o.createdAt < :cutoff
            """)
    List<UUID> findUnpaidTransferOrderIds(@org.springframework.data.repository.query.Param("cutoff") java.time.OffsetDateTime cutoff);

    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Order> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, String status);

    Optional<Order> findByIdAndUserId(UUID id, UUID userId);

    List<Order> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<Order> findByEmployeeIdAndStatusOrderByCreatedAtDesc(UUID employeeId, String status);

    Optional<Order> findByIdAndEmployeeId(UUID id, UUID employeeId);

    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findByStatusOrderByCreatedAtDesc(String status);
}
