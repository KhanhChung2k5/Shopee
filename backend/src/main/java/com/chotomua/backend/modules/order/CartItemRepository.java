package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    List<CartItem> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    List<CartItem> findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(UUID userId);

    Optional<CartItem> findByIdAndUserId(UUID id, UUID userId);

    Optional<CartItem> findByUserIdAndVariantId(UUID userId, UUID variantId);
}
