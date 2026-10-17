package com.chotomua.backend.modules.marketing.dto;
import com.chotomua.backend.modules.marketing.Review; import java.util.UUID;
public record ReviewResponse(UUID id,UUID orderItemId,int rating,String comment,String replyText){public static ReviewResponse from(Review r){return new ReviewResponse(r.getId(),r.getOrderItemId(),r.getRating(),r.getComment(),r.getReplyText());}}
