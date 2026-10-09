package com.chotomua.backend.modules.order;

import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Read-only boundary to P2; P3 stores a warehouse UUID but does not own Warehouse entities. */
@Repository
public class WarehouseLookup {

    private final EntityManager entityManager;

    public WarehouseLookup(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public boolean existsById(UUID warehouseId) {
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM warehouses WHERE id = :warehouseId"
                )
                .setParameter("warehouseId", warehouseId)
                .getSingleResult();
        return count.longValue() > 0;
    }
}
