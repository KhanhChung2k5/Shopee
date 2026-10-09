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

    @Query("""
            select s.variant.id as variantId, sum(s.quantity - s.reservedQuantity) as availableQuantity
            from InventoryStock s
            where s.variant.id in :variantIds
            group by s.variant.id
            """)
    List<VariantAvailability> findAvailabilityByVariantIds(@Param("variantIds") Collection<UUID> variantIds);

    interface VariantAvailability {
        UUID getVariantId();
        Long getAvailableQuantity();
    }
}
