package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundReturnRepository extends JpaRepository<RefundReturn, UUID> {
    List<RefundReturn> findAllByOrderByRequestedAtDesc();

    List<RefundReturn> findByStatusOrderByRequestedAtDesc(String status);

    List<RefundReturn> findByOrderIdOrderByRequestedAtAsc(UUID orderId);

    List<RefundReturn> findByOrderItemId(UUID orderItemId);

    List<RefundReturn> findByOrderIdInAndStatus(java.util.Collection<UUID> orderIds, String status);
}
