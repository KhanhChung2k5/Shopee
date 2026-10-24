package com.chotomua.backend.modules.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p left join p.category c
            where p.status = 'published'
              and (:categoryId is null or c.id = :categoryId)
              and (:brandName = '' or lower(p.brandName) = lower(:brandName))
              and (:productType = '' or p.productType = :productType)
              and (:search = '' or lower(p.name) like lower(concat('%', :search, '%')))
            """)
    Page<Product> findPublishedProducts(@Param("categoryId") UUID categoryId,
                                        @Param("brandName") String brandName,
                                        @Param("productType") String productType,
                                        @Param("search") String search,
                                        Pageable pageable);

    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p left join p.category c
            where p.status = 'published' and c.id in :categoryIds
              and (:brandName = '' or lower(p.brandName) = lower(:brandName))
              and (:productType = '' or p.productType = :productType)
              and (:search = '' or lower(p.name) like lower(concat('%', :search, '%')))
            """)
    Page<Product> findPublishedProductsInCategories(@Param("categoryIds") Collection<UUID> categoryIds,
                                                    @Param("brandName") String brandName,
                                                    @Param("productType") String productType,
                                                    @Param("search") String search,
                                                    Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Optional<Product> findByIdAndStatus(UUID id, String status);

    /**
     * Real "sold" and rating figures for a page of products. Sold uses the same rule as the
     * top-sellers ranking: quantity on every non-cancelled order. Rating averages buyers' reviews.
     */
    @Query(value = """
            SELECT p.id AS productId,
                   COALESCE((SELECT SUM(oi.quantity) FROM order_items oi
                             JOIN orders o ON o.id = oi.order_id
                             JOIN product_variants pv ON pv.id = oi.variant_id
                             WHERE pv.product_id = p.id AND o.status <> 'cancelled'), 0)::bigint AS soldCount,
                   (SELECT AVG(r.rating) FROM reviews r
                      JOIN order_items oi ON oi.id = r.order_item_id
                      JOIN product_variants pv ON pv.id = oi.variant_id
                      WHERE pv.product_id = p.id)::float8 AS ratingAverage,
                   (SELECT COUNT(*) FROM reviews r
                      JOIN order_items oi ON oi.id = r.order_item_id
                      JOIN product_variants pv ON pv.id = oi.variant_id
                      WHERE pv.product_id = p.id)::bigint AS ratingCount
            FROM products p
            WHERE p.id IN (:ids)
            """, nativeQuery = true)
    List<SalesStats> findSalesStats(@Param("ids") Collection<UUID> ids);

    interface SalesStats {
        UUID getProductId();
        Long getSoldCount();
        Double getRatingAverage();
        Long getRatingCount();
    }
}
