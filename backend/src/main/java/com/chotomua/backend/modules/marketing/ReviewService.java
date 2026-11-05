package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.OrderReviewsResponse;
import com.chotomua.backend.modules.marketing.dto.ReviewRequest;
import com.chotomua.backend.modules.order.Order;
import com.chotomua.backend.modules.order.OrderItem;
import com.chotomua.backend.modules.order.OrderItemRepository;
import com.chotomua.backend.modules.order.OrderRepository;
import com.chotomua.backend.modules.order.OrderStatusHistory;
import com.chotomua.backend.modules.order.OrderStatusHistoryRepository;
import com.chotomua.backend.modules.order.RefundReturnRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who may review what, and until when. A buyer reviews each line of their own delivered order once, within
 * {@link #WINDOW} of delivery, unless the line is being or was sent back; within the same window they may change
 * or remove that review.
 */
@Service
public class ReviewService {

    public static final Duration WINDOW = Duration.ofDays(30);

    private final ReviewRepository reviews;
    private final OrderItemRepository items;
    private final OrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final RefundReturnRepository refunds;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public ReviewService(ReviewRepository reviews, OrderItemRepository items, OrderRepository orders,
                         OrderStatusHistoryRepository history, RefundReturnRepository refunds) {
        this(reviews, items, orders, history, refunds, Clock.systemUTC());
    }

    ReviewService(ReviewRepository reviews, OrderItemRepository items, OrderRepository orders,
                  OrderStatusHistoryRepository history, RefundReturnRepository refunds, Clock clock) {
        this.reviews = reviews;
        this.items = items;
        this.orders = orders;
        this.history = history;
        this.refunds = refunds;
        this.clock = clock;
    }

    /** Every line of the buyer's order with its review, if any, and whether it can be reviewed or changed now. */
    @Transactional(readOnly = true)
    public OrderReviewsResponse forOrder(UUID buyerId, UUID orderId) {
        Order order = orders.findByIdAndUserId(orderId, buyerId).orElseThrow(() -> new NoSuchElementException("Không tìm thấy đơn hàng"));
        List<OrderItem> lines = items.findByOrderId(orderId);
        Map<UUID, Review> byItem = reviews.findByOrderItemIdIn(lines.stream().map(OrderItem::getId).toList()).stream()
                .collect(Collectors.toMap(Review::getOrderItemId, Function.identity()));
        Instant deadline = deadline(order);
        boolean open = deadline != null && Instant.now(clock).isBefore(deadline);
        List<OrderReviewsResponse.Line> result = lines.stream().map(line -> {
            String blocked = blockedReason(order, line, deadline);
            Review review = byItem.get(line.getId());
            return new OrderReviewsResponse.Line(line.getId(),
                    review == null ? null : com.chotomua.backend.modules.marketing.dto.ReviewResponse.from(review),
                    review == null && blocked == null,
                    review != null && open,
                    review == null ? blocked : null);
        }).toList();
        return new OrderReviewsResponse(deadline, result);
    }

    @Transactional
    public Review create(UUID buyerId, ReviewRequest request) {
        OrderItem line = items.findById(request.orderItemId()).orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm trong đơn"));
        Order order = orders.findByIdAndUserId(line.getOrderId(), buyerId)
                .orElseThrow(() -> new AccessDeniedException("Bạn chỉ đánh giá được sản phẩm trong đơn của mình"));
        String blocked = blockedReason(order, line, deadline(order));
        if (blocked != null) throw new IllegalStateException(blocked);
        if (reviews.findByOrderItemId(line.getId()).isPresent()) throw new IllegalStateException("Bạn đã đánh giá sản phẩm này");
        return reviews.save(new Review(buyerId, line.getId(), request.rating(), clean(request.comment())));
    }

    @Transactional
    public Review edit(UUID buyerId, UUID reviewId, ReviewRequest request) {
        Review review = ownReview(buyerId, reviewId);
        review.edit(request.rating(), clean(request.comment()));
        return reviews.save(review);
    }

    @Transactional
    public void delete(UUID buyerId, UUID reviewId) {
        reviews.delete(ownReview(buyerId, reviewId));
    }

    /** The buyer's own review, still inside the window of its order. */
    private Review ownReview(UUID buyerId, UUID reviewId) {
        Review review = reviews.findById(reviewId).orElseThrow(() -> new NoSuchElementException("Không tìm thấy đánh giá"));
        if (!review.getUserId().equals(buyerId)) throw new AccessDeniedException("Bạn chỉ sửa được đánh giá của mình");
        OrderItem line = items.findById(review.getOrderItemId()).orElseThrow();
        Order order = orders.findById(line.getOrderId()).orElseThrow();
        Instant deadline = deadline(order);
        if (deadline == null || !Instant.now(clock).isBefore(deadline)) {
            throw new IllegalStateException("Đã quá " + WINDOW.toDays() + " ngày kể từ khi nhận hàng, không sửa hoặc xoá được đánh giá nữa");
        }
        return review;
    }

    /** Why this line cannot be reviewed now, or null if it can. */
    private String blockedReason(Order order, OrderItem line, Instant deadline) {
        if (!"delivered".equals(order.getStatus()) || deadline == null) return "Chỉ đánh giá được khi đơn đã giao";
        if (!Instant.now(clock).isBefore(deadline)) return "Đã quá " + WINDOW.toDays() + " ngày kể từ khi nhận hàng";
        boolean returned = refunds.findByOrderItemId(line.getId()).stream()
                .anyMatch(r -> "return".equals(r.getKind()) && !"rejected".equals(r.getStatus()));
        if (returned) return "Sản phẩm đã yêu cầu trả hàng nên không đánh giá được";
        return null;
    }

    /** Delivery time plus the review window; null while the order is not delivered. */
    private Instant deadline(Order order) {
        if (!"delivered".equals(order.getStatus())) return null;
        return history.findByOrderIdOrderByChangedAtAsc(order.getId()).stream()
                .filter(h -> "delivered".equals(h.getStatus()))
                .map(OrderStatusHistory::getChangedAt)
                .reduce((first, last) -> last)
                .map(at -> at.toInstant().plus(WINDOW))
                .orElse(null);
    }

    private static String clean(String comment) {
        return comment == null || comment.isBlank() ? null : comment.trim();
    }
}
