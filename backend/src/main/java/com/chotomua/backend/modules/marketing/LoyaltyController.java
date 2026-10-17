package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.LoyaltyResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/loyalty")
public class LoyaltyController {

    private final LoyaltyService service;

    public LoyaltyController(LoyaltyService service) {
        this.service = service;
    }

    @GetMapping
    public LoyaltyResponse summary(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return service.summary(userId);
    }
}
