package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.LoyaltyResponse;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoyaltyService {

    private final UserRepository users;
    private final LoyaltyTransactionRepository transactions;

    public LoyaltyService(UserRepository users, LoyaltyTransactionRepository transactions) {
        this.users = users;
        this.transactions = transactions;
    }

    @Transactional(readOnly = true)
    public LoyaltyResponse summary(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));
        return new LoyaltyResponse(user.getLoyaltyBalance(), user.getLoyaltyTier(),
                transactions.findByUserIdOrderByCreatedAtDescIdDesc(userId).stream()
                        .map(LoyaltyResponse.Transaction::from).toList());
    }
}
