package com.chotomua.backend.modules.marketing;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface ReviewRepository extends JpaRepository<Review,UUID>{
    Optional<Review> findByOrderItemId(UUID id);
    List<Review> findByOrderItemIdIn(List<UUID> ids);

    @Query(value = "SELECT r.id AS id, r.rating AS rating, r.comment AS comment, r.reply_text AS replyText, "
        + "r.created_at AS createdAt, u.full_name AS buyerName, oi.product_name_snapshot AS productName "
        + "FROM reviews r "
        + "JOIN order_items oi ON oi.id = r.order_item_id "
        + "JOIN users u ON u.id = r.user_id "
        + "WHERE r.rating >= 4 AND r.comment IS NOT NULL AND length(trim(r.comment)) > 0 "
        + "ORDER BY r.created_at DESC LIMIT :limit", nativeQuery = true)
    List<ReviewShowcaseProjection> findShowcase(@Param("limit") int limit);
}
