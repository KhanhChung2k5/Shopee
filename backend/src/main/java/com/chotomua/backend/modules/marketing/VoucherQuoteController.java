package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.AvailableVoucherResponse;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/vouchers")
public class VoucherQuoteController {

    private final VoucherQuoteService service;
    private final VoucherDiscoveryService discovery;

    public VoucherQuoteController(VoucherQuoteService service, VoucherDiscoveryService discovery) {
        this.service = service;
        this.discovery = discovery;
    }

    @GetMapping
    public List<AvailableVoucherResponse> available(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return discovery.availableFor(userId);
    }

    @PostMapping("/quote")
    public VoucherQuoteResponse quote(Authentication authentication, @Valid @RequestBody VoucherQuoteRequest request) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return service.quote(userId, request);
    }
}
