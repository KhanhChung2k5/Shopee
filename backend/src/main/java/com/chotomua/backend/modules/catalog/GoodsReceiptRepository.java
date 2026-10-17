package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID> {
    @EntityGraph(attributePaths = {"employee", "warehouse", "items", "items.variant"})
    List<GoodsReceipt> findAllByOrderByReceivedAtDesc();

    @Override
    @EntityGraph(attributePaths = {"employee", "warehouse", "items", "items.variant"})
    Optional<GoodsReceipt> findById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from GoodsReceipt r where r.id = :id")
    Optional<GoodsReceipt> findByIdForUpdate(@Param("id") UUID id);
}
