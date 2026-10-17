package com.chotomua.backend.modules.catalog;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findByProduct_IdAndStatus(UUID productId, String status);
    List<ProductVariant> findByProduct_IdInAndStatus(Collection<UUID> productIds, String status);
}
