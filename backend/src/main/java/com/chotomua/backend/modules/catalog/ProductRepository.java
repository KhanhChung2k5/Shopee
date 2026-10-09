package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.Collection;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            left join p.category c
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
            select p from Product p
            left join p.category c
            where p.status = 'published'
              and c.id in :categoryIds
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
    java.util.Optional<Product> findByIdAndStatus(UUID id, String status);
}
