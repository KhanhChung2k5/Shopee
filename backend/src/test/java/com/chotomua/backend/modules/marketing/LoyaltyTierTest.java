package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.Order;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class LoyaltyTierTest {

    @Test
    void ranksByLifetimePoints() {
        assertThat(LoyaltyTier.forPoints(0)).isEqualTo(LoyaltyTier.BRONZE);
        assertThat(LoyaltyTier.forPoints(499)).isEqualTo(LoyaltyTier.BRONZE);
        assertThat(LoyaltyTier.forPoints(500)).isEqualTo(LoyaltyTier.SILVER);
        assertThat(LoyaltyTier.forPoints(2_000)).isEqualTo(LoyaltyTier.GOLD);
        assertThat(LoyaltyTier.forPoints(12_345)).isEqualTo(LoyaltyTier.DIAMOND);
        assertThat(LoyaltyTier.ofUser(null)).isEqualTo(LoyaltyTier.BRONZE);
        assertThat(LoyaltyTier.fromCode("Kim cương")).isEmpty();
    }

    @Test
    void awardingPointsMovesTheBuyerUpATier() {
        UserRepository users = mock(UserRepository.class);
        LoyaltyTransactionRepository transactions = mock(LoyaltyTransactionRepository.class);
        User buyer = new User("buyer", "hash");
        ReflectionTestUtils.setField(buyer, "id", UUID.randomUUID());
        buyer.setLoyaltyBalance(480);
        when(users.findByIdForUpdate(any())).thenReturn(Optional.of(buyer));
        when(transactions.sumEarnedPoints(buyer.getId())).thenReturn(480L);
        Order order = mock(Order.class);
        when(order.getId()).thenReturn(UUID.randomUUID());
        when(order.getUserId()).thenReturn(buyer.getId());
        when(order.getTotalAmount()).thenReturn(new BigDecimal("250000")); // 25 points -> 505 lifetime

        new LoyaltyAwardService(users, transactions).award(order);

        assertThat(buyer.getLoyaltyBalance()).isEqualTo(505);
        assertThat(buyer.getLoyaltyTier()).isEqualTo("silver");
    }
}
