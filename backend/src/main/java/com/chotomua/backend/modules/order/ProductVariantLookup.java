package com.chotomua.backend.modules.order;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/**
 * Narrow read-only boundary from the Order domain to the Catalog domain.
 *
 * <p>P3 stores only the variant UUID and does not own Catalog entities. This lookup can be
 * replaced by a Catalog service once P2 exposes one, without coupling CartService to P2's
 * implementation classes.</p>
 */
@Repository
public class ProductVariantLookup {

    private final EntityManager entityManager;

    public ProductVariantLookup(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public boolean existsActiveById(UUID variantId) {
        return findActiveById(variantId).isPresent();
    }

    /** Returns display data even when a product was disabled after it entered the cart. */
    public Optional<CartProductSnapshot> findCartProductById(UUID variantId) {
        List<?> results = entityManager.createNativeQuery("""
                        SELECT pv.id,
                               p.name,
                               p.product_type,
                               COALESCE(pv.image_url, p.image_urls ->> 0),
                               pv.price,
                               CAST(pv.attributes AS TEXT),
                               (pv.status = 'active' AND p.status = 'published')
                        FROM product_variants pv
                        JOIN products p ON p.id = pv.product_id
                        WHERE pv.id = :variantId
                        """)
                .setParameter("variantId", variantId)
                .getResultList();
        if (results.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = (Object[]) results.getFirst();
        return Optional.of(new CartProductSnapshot(
                (UUID) row[0],
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (BigDecimal) row[4],
                (String) row[5],
                (Boolean) row[6]
        ));
    }

    /** Returns only the Catalog fields P3 must snapshot while creating an order. */
    public Optional<ProductVariantSnapshot> findActiveById(UUID variantId) {
        List<?> results = entityManager.createNativeQuery("""
                        SELECT pv.id, pv.price, p.name, CAST(pv.attributes AS TEXT)
                        FROM product_variants pv
                        JOIN products p ON p.id = pv.product_id
                        WHERE pv.id = :variantId
                          AND pv.status = 'active'
                          AND p.status = 'published'
                        """)
                .setParameter("variantId", variantId)
                .getResultList();
        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toSnapshot(results.getFirst()));
    }

    private ProductVariantSnapshot toSnapshot(Object result) {
        Object[] row = (Object[]) result;
        return new ProductVariantSnapshot(
                (UUID) row[0],
                (BigDecimal) row[1],
                (String) row[2],
                (String) row[3]
        );
    }
}
