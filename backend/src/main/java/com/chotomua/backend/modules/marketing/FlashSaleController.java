package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.FlashSaleResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/flash-sales")
public class FlashSaleController {

    private final FlashSaleService service;

    public FlashSaleController(FlashSaleService service) {
        this.service = service;
    }

    @GetMapping
    public List<FlashSaleResponse> list(Authentication authentication) {
        boolean buyer = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_BUYER".equals(authority.getAuthority()));
        UUID buyerId = buyer ? UUID.fromString((String) authentication.getPrincipal()) : null;
        return service.list(buyerId);
    }
}
