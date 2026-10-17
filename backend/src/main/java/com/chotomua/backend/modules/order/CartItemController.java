package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.CartItemCreateRequest;
import com.chotomua.backend.modules.order.dto.CartItemQuantityRequest;
import com.chotomua.backend.modules.order.dto.CartItemResponse;
import com.chotomua.backend.modules.order.dto.CartItemSelectionRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cart operations always apply to the user in the JWT, never to a client-supplied userId. */
@RestController
@RequestMapping("/cart-items")
public class CartItemController {

    private final CartItemService cartItemService;

    public CartItemController(CartItemService cartItemService) {
        this.cartItemService = cartItemService;
    }

    @GetMapping
    public List<CartItemResponse> list(Authentication authentication) {
        return cartItemService.listForUser(currentUserId(authentication));
    }

    @PostMapping
    public ResponseEntity<CartItemResponse> add(
            Authentication authentication,
            @Valid @RequestBody CartItemCreateRequest request
    ) {
        CartItemResponse created = cartItemService.add(currentUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public CartItemResponse updateQuantity(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody CartItemQuantityRequest request
    ) {
        return cartItemService.updateQuantity(currentUserId(authentication), id, request);
    }

    @PatchMapping("/{id}/selection")
    public CartItemResponse updateSelection(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody CartItemSelectionRequest request
    ) {
        return cartItemService.updateSelection(currentUserId(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable UUID id) {
        cartItemService.delete(currentUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
