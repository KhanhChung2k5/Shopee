package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

public interface InventoryStockRepository extends JpaRepository<InventoryStock, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<InventoryStock> findByVariant_IdAndWarehouse_Id(UUID variantId, UUID warehouseId);

    @Query("select s from InventoryStock s where s.variant.id = :variantId and s.warehouse.id = :warehouseId")
    Optional<InventoryStock> findStockByVariantAndWarehouse(@Param("variantId") UUID variantId,
                                                            @Param("warehouseId") UUID warehouseId);

    List<InventoryStock> findByWarehouse_Id(UUID warehouseId);
    List<InventoryStock> findByVariant_Id(UUID variantId);

    /** Sellable units per variant: on hand minus what open, not-yet-packed orders hold (same rule as checkout). */
    @Query(value = """
            SELECT s.variant_id AS "variantId",
                   GREATEST(SUM(s.quantity - s.reserved_qty) - COALESCE(MAX(held.quantity), 0), 0) AS "availableQuantity"
            FROM inventory_stocks s
            LEFT JOIN (
                SELECT oi.variant_id, SUM(oi.quantity) AS quantity
                FROM order_items oi JOIN orders o ON o.id = oi.order_id
                WHERE o.status IN ('pending', 'confirmed', 'cancel_requested') AND o.shipment_status = 'pending'
                GROUP BY oi.variant_id
            ) held ON held.variant_id = s.variant_id
            WHERE s.variant_id IN (:variantIds)
            GROUP BY s.variant_id
            """, nativeQuery = true)
    List<VariantAvailability> findAvailabilityByVariantIds(@Param("variantIds") Collection<UUID> variantIds);

    /** Units of a variant promised to open orders that have not been packed yet. */
    @Query(value = """
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE oi.variant_id = :variantId
              AND o.status IN ('pending', 'confirmed', 'cancel_requested') AND o.shipment_status = 'pending'
            """, nativeQuery = true)
    long countHeldByOpenOrders(@Param("variantId") UUID variantId);

    @Query("select coalesce(sum(s.quantity - s.reservedQuantity), 0) from InventoryStock s where s.variant.id = :variantId")
    long countOnHand(@Param("variantId") UUID variantId);

    interface VariantAvailability {
        UUID getVariantId();
        Number getAvailableQuantity();
    }
}
