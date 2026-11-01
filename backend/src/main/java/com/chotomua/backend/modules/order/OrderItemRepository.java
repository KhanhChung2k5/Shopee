package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


// Repository for OrderItem
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    // Find all OrderItems by orderId
    List<OrderItem> findByOrderId(UUID orderId);

    // Count the number of OrderItems by orderId
    long countByOrderId(UUID orderId);

    /** Number of lines of each order, for a whole order list in one query: rows of [orderId, count]. */
    // Count the number of lines of each order
    @org.springframework.data.jpa.repository.Query("select i.orderId, count(i) from OrderItem i where i.orderId in :orderIds group by i.orderId")
    List<Object[]> countLinesByOrderIds(@org.springframework.data.repository.query.Param("orderIds") java.util.Collection<UUID> orderIds);
}
