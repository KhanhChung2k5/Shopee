package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Collection;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findByProduct_IdAndStatus(UUID productId, String status);
    List<ProductVariant> findByProduct_IdInAndStatus(Collection<UUID> productIds, String status);
}
