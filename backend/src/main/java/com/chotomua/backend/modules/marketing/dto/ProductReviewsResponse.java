package com.chotomua.backend.modules.marketing.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Reviews of one product for its public page: the average (one decimal, null with no review), how many reviews
 * gave each number of stars ({@code starCounts[0]} = 1 star … {@code [4]} = 5 stars) and the reviews themselves.
 */
public record ProductReviewsResponse(BigDecimal averageRating, int reviewCount, int[] starCounts,
                                     List<ReviewShowcaseResponse> reviews) {

    public static ProductReviewsResponse of(List<ReviewShowcaseResponse> reviews) {
        int[] stars = new int[5];
        int sum = 0;
        for (ReviewShowcaseResponse review : reviews) {
            int rating = Math.max(1, Math.min(5, review.rating()));
            stars[rating - 1]++;
            sum += rating;
        }
        BigDecimal average = reviews.isEmpty() ? null
                : BigDecimal.valueOf(sum).divide(BigDecimal.valueOf(reviews.size()), 1, RoundingMode.HALF_UP);
        return new ProductReviewsResponse(average, reviews.size(), stars, reviews);
    }
}
