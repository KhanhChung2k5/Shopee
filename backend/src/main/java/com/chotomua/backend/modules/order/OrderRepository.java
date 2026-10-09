package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Order> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, String status);

    Optional<Order> findByIdAndUserId(UUID id, UUID userId);

    List<Order> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<Order> findByEmployeeIdAndStatusOrderByCreatedAtDesc(UUID employeeId, String status);

    Optional<Order> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
