package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.marketing.dto.OrderReviewsResponse;
import com.chotomua.backend.modules.marketing.dto.ProductReviewsResponse;
import com.chotomua.backend.modules.marketing.dto.ReviewManageResponse;
import com.chotomua.backend.modules.marketing.dto.ReviewReplyRequest;
import com.chotomua.backend.modules.marketing.dto.ReviewRequest;
import com.chotomua.backend.modules.marketing.dto.ReviewResponse;
import com.chotomua.backend.modules.marketing.dto.ReviewShowcaseResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reviews")
public class ReviewController {

    private final ReviewRepository reviews;
    private final ReviewService service;
    private final EmployeeRepository employees;

    public ReviewController(ReviewRepository reviews, ReviewService service, EmployeeRepository employees) {
        this.reviews = reviews;
        this.service = service;
        this.employees = employees;
    }

    /** Public homepage review showcase — highest-rated recent reviews with a comment. */
    @GetMapping
    public List<ReviewShowcaseResponse> showcase(@RequestParam(defaultValue = "6") int limit) {
        return reviews.findShowcase(Math.min(limit, 20)).stream().map(ReviewShowcaseResponse::from).toList();
    }

    /** Public product page: every review of the product (all its variants), with the average and the star breakdown. */
    @GetMapping("/product/{productId}")
    public ProductReviewsResponse forProduct(@PathVariable UUID productId) {
        return ProductReviewsResponse.of(reviews.findForProduct(productId).stream().map(ReviewShowcaseResponse::from).toList());
    }

    /** Buyer: their reviews on one of their orders, and what they can still review, change or remove. */
    @GetMapping("/mine")
    public OrderReviewsResponse mine(Authentication auth, @RequestParam UUID orderId) {
        return service.forOrder(userId(auth), orderId);
    }

    /** Staff moderation list (sales/cs/admin — see SecurityConfig); {@code unreplied=true} keeps only reviews still waiting for a reply. */
    @GetMapping("/manage")
    public List<ReviewManageResponse> manage(@RequestParam(defaultValue = "false") boolean unreplied) {
        return reviews.findForStaff(unreplied).stream().map(ReviewManageResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> create(Authentication auth, @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ReviewResponse.from(service.create(userId(auth), request)));
    }

    @PutMapping("/{id}")
    public ReviewResponse edit(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ReviewRequest request) {
        return ReviewResponse.from(service.edit(userId(auth), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable UUID id) {
        service.delete(userId(auth), id);
        return ResponseEntity.noContent().build();
    }

    /** CS answers a review (or changes their answer) — from the admin page or the product page. */
    @PatchMapping("/{id}/reply")
    public ReviewResponse reply(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ReviewReplyRequest request) {
        Employee employee = employees.findByUserId(userId(auth)).orElseThrow(() -> new AccessDeniedException("Không tìm thấy nhân viên"));
        if (!"cs".equals(employee.getDepartment())) {
            throw new AccessDeniedException("Không có quyền phản hồi đánh giá");
        }
        Review review = reviews.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy đánh giá"));
        review.reply(employee.getId(), request.replyText().trim());
        return ReviewResponse.from(reviews.save(review));
    }

    private static UUID userId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
