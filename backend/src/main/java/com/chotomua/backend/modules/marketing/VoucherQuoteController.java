package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/vouchers")
public class VoucherQuoteController {

    private final VoucherQuoteService service;

    public VoucherQuoteController(VoucherQuoteService service) {
        this.service = service;
    }

    @PostMapping("/quote")
    public VoucherQuoteResponse quote(Authentication authentication, @Valid @RequestBody VoucherQuoteRequest request) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return service.quote(userId, request);
    }
}
