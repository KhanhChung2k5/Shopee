package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.RefundBankAccountRequest;
import com.chotomua.backend.modules.order.dto.RefundDecisionRequest;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import com.chotomua.backend.modules.order.dto.RefundReturnRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Buyer: request a return, give the bank account. CS / admin: approve, reject, record the transfer back. */
@RestController
@RequestMapping("/refund-returns")
public class RefundController {

    private final RefundService service;

    public RefundController(RefundService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<RefundResponse> request(Authentication auth, @Valid @RequestBody RefundReturnRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.requestReturn(userId(auth), request));
    }

    @PatchMapping("/{id}/bank-account")
    public RefundResponse bankAccount(Authentication auth, @PathVariable UUID id,
                                      @Valid @RequestBody RefundBankAccountRequest request) {
        return service.updateBankAccount(userId(auth), id, request);
    }

    @GetMapping
    public List<RefundResponse> list(Authentication auth, @RequestParam(required = false) String status) {
        return service.listForStaff(userId(auth), status);
    }

    @PatchMapping("/{id}/approve")
    public RefundResponse approve(Authentication auth, @PathVariable UUID id) {
        return service.approve(userId(auth), id);
    }

    @PatchMapping("/{id}/reject")
    public RefundResponse reject(Authentication auth, @PathVariable UUID id, @Valid @RequestBody RefundDecisionRequest request) {
        return service.reject(userId(auth), id, request.note());
    }

    @PatchMapping("/{id}/refunded")
    public RefundResponse refunded(Authentication auth, @PathVariable UUID id, @Valid @RequestBody RefundDecisionRequest request) {
        return service.markRefunded(userId(auth), id, request.transferRef());
    }

    private static UUID userId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
