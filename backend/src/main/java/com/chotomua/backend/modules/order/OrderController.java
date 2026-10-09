package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.OrderCreateRequest;
import com.chotomua.backend.modules.order.dto.OrderDetailResponse;
import com.chotomua.backend.modules.order.dto.OrderResponse;
import com.chotomua.backend.modules.order.dto.OrderShippingInfoRequest;
import com.chotomua.backend.modules.order.dto.OrderShippingResponse;
import com.chotomua.backend.modules.order.dto.OrderStatusUpdateRequest;
import com.chotomua.backend.modules.order.dto.OrderStatusUpdateResponse;
import com.chotomua.backend.modules.order.dto.OrderSummaryResponse;
import com.chotomua.backend.modules.order.dto.OrderTrackingUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            Authentication authentication,
            @Valid @RequestBody OrderCreateRequest request
    ) {
        OrderResponse created = orderService.createFromSelectedCart(currentUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public List<OrderSummaryResponse> list(
            Authentication authentication,
            @RequestParam(required = false) String status
    ) {
        UUID userId = currentUserId(authentication);
        if (hasRole(authentication, "ROLE_BUYER")) {
            return orderService.listForBuyer(userId, status);
        }
        return orderService.listForEmployeeUser(userId, status);
    }

    @GetMapping("/{id}")
    public OrderDetailResponse get(Authentication authentication, @PathVariable UUID id) {
        UUID userId = currentUserId(authentication);
        if (hasRole(authentication, "ROLE_BUYER")) {
            return orderService.getForBuyer(userId, id);
        }
        return orderService.getForEmployeeUser(userId, id);
    }

    @PatchMapping("/{id}/status")
    public OrderStatusUpdateResponse updateStatus(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody OrderStatusUpdateRequest request
    ) {
        UUID userId = currentUserId(authentication);
        if (hasRole(authentication, "ROLE_BUYER")) {
            return orderService.updateStatusForBuyer(userId, id, request);
        }
        return orderService.updateStatusForEmployeeUser(userId, id, request);
    }

    @PatchMapping("/{id}/shipping-info")
    public OrderShippingResponse updateShippingInfo(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody OrderShippingInfoRequest request
    ) {
        return orderService.updateShippingInfo(currentUserId(authentication), id, request);
    }

    @PatchMapping("/{id}/tracking")
    public OrderShippingResponse updateTracking(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody OrderTrackingUpdateRequest request
    ) {
        return orderService.updateTracking(currentUserId(authentication), id, request);
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals(role));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
