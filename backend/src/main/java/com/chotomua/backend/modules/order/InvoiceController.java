package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.InvoiceResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Invoice of an order: the buyer reads their own, staff read any; sales/admin reissue (see SecurityConfig). */
@RestController
@RequestMapping("/orders/{orderId}/invoice")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @GetMapping
    public InvoiceResponse.ForOrder get(Authentication auth, @PathVariable UUID orderId) {
        boolean staff = auth.getAuthorities().stream().anyMatch(a -> "ROLE_STAFF".equals(a.getAuthority()));
        return service.forOrder(orderId, UUID.fromString((String) auth.getPrincipal()), staff);
    }

    @PostMapping("/reissue")
    public InvoiceResponse reissue(Authentication auth, @PathVariable UUID orderId, @RequestBody InvoiceService.ReissueRequest request) {
        return service.reissue(orderId, UUID.fromString((String) auth.getPrincipal()), request);
    }
}
