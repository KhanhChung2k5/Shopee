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

    /** Staff moderation list: every review, newest first, optionally only those still waiting for a reply. */
    @Query(value = "SELECT r.id AS id, r.rating AS rating, r.comment AS comment, r.reply_text AS replyText, "
        + "r.created_at AS createdAt, u.full_name AS buyerName, oi.product_name_snapshot AS productName, "
        + "oi.order_id AS orderId, ru.full_name AS repliedByName "
        + "FROM reviews r "
        + "JOIN order_items oi ON oi.id = r.order_item_id "
        + "JOIN users u ON u.id = r.user_id "
        + "LEFT JOIN employees e ON e.id = r.employee_reply_id "
        + "LEFT JOIN users ru ON ru.id = e.user_id "
        + "WHERE (:unrepliedOnly = false OR r.reply_text IS NULL) "
        + "ORDER BY r.created_at DESC", nativeQuery = true)
    List<ReviewManageProjection> findForStaff(@Param("unrepliedOnly") boolean unrepliedOnly);
}
