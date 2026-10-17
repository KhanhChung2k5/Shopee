package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.order.dto.WalletBalanceResponse;
import com.chotomua.backend.modules.order.dto.WalletTopUpRequest;
import com.chotomua.backend.modules.order.dto.WalletTopUpResponse;
import com.chotomua.backend.modules.order.dto.WalletTransactionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public WalletBalanceResponse balance(Authentication authentication) {
        return walletService.balance(currentUserId(authentication));
    }

    @GetMapping("/transactions")
    public List<WalletTransactionResponse> transactions(Authentication authentication) {
        return walletService.transactions(currentUserId(authentication));
    }

    @PostMapping("/topups")
    public ResponseEntity<WalletTopUpResponse> topUp(Authentication authentication,
                                                     @Valid @RequestBody WalletTopUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(walletService.topUp(currentUserId(authentication), request));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
