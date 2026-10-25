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

    /**
     * Sellable units per variant: stock on hand minus what open orders still hold. An order holds its units from
     * checkout until it is packed (then the stock really leaves the warehouse) or cancelled — so two buyers can
     * never both buy the last unit.
     */
    static final String AVAILABLE_STOCK = """
            SELECT s.variant_id,
                   GREATEST(SUM(s.quantity - s.reserved_qty) - COALESCE(MAX(held.quantity), 0), 0) AS available_quantity
            FROM inventory_stocks s
            LEFT JOIN (
                SELECT oi.variant_id, SUM(oi.quantity) AS quantity
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status IN ('pending', 'confirmed', 'cancel_requested') AND o.shipment_status = 'pending'
                GROUP BY oi.variant_id
            ) held ON held.variant_id = s.variant_id
            GROUP BY s.variant_id
            """;

    private final EntityManager entityManager;

    public ProductVariantLookup(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    /**
     * Locks the variant's stock rows until the checkout transaction ends, so concurrent checkouts of the same
     * variant run one after the other and each sees the units the previous one took. Call in a stable order.
     */
    public void lockStock(UUID variantId) {
        entityManager.createNativeQuery("SELECT id FROM inventory_stocks WHERE variant_id = :variantId ORDER BY id FOR UPDATE")
                .setParameter("variantId", variantId)
                .getResultList();
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
                               (pv.status = 'active' AND p.status = 'published'
                                   AND COALESCE(stock.available_quantity, 0) > 0),
                               COALESCE(stock.available_quantity, 0)
                        FROM product_variants pv
                        JOIN products p ON p.id = pv.product_id
                        LEFT JOIN (%s) stock ON stock.variant_id = pv.id
                        WHERE pv.id = :variantId
                        """.formatted(AVAILABLE_STOCK))
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
                (Boolean) row[6],
                ((Number) row[7]).intValue()
        ));
    }

    /** Returns only the Catalog fields P3 must snapshot while creating an order. */
    public Optional<ProductVariantSnapshot> findActiveById(UUID variantId) {
        List<?> results = entityManager.createNativeQuery("""
                        SELECT pv.id,
                               pv.price,
                               p.name,
                               CAST(pv.attributes AS TEXT),
                               COALESCE(stock.available_quantity, 0),
                               p.product_type
                        FROM product_variants pv
                        JOIN products p ON p.id = pv.product_id
                        LEFT JOIN (%s) stock ON stock.variant_id = pv.id
                        WHERE pv.id = :variantId
                          AND pv.status = 'active'
                          AND p.status = 'published'
                        """.formatted(AVAILABLE_STOCK))
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
                (String) row[3],
                ((Number) row[4]).intValue(),
                (String) row[5]
        );
    }
}
