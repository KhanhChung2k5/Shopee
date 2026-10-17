package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;

import java.util.UUID;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {
    @EntityGraph(attributePaths = {"stock", "stock.variant", "stock.warehouse"})
    List<InventoryMovement> findByStock_IdOrderByOccurredAtDesc(UUID stockId);
}
