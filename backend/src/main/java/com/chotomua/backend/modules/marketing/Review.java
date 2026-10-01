package com.chotomua.backend.modules.marketing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "order_item_id", nullable = false, unique = true)
    private UUID orderItemId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "employee_reply_id")
    private UUID employeeReplyId;

    @Column(name = "reply_text", columnDefinition = "text")
    private String replyText;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Review() {
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getOrderItemId() { return orderItemId; }
    public Integer getRating() { return rating; }
    public String getComment() { return comment; }
    public UUID getEmployeeReplyId() { return employeeReplyId; }
    public String getReplyText() { return replyText; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
