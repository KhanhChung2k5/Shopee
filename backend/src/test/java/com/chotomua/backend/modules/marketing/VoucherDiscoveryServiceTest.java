package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class VoucherDiscoveryServiceTest {

    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final VoucherDiscoveryService service = new VoucherDiscoveryService(vouchers, programs, users);

    @Test
    void listsOnlyActiveVouchersForBuyerTier() {
        UUID userId = UUID.randomUUID();
        UUID openId = UUID.randomUUID();
        UUID premiumId = UUID.randomUUID();
        UUID futureId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        User buyer = new User("buyer", "hash");
        buyer.setLoyaltyTier("silver");
        when(users.findById(userId)).thenReturn(Optional.of(buyer));

        PromotionProgram open = program(openId, null, now.minusDays(1), now.plusDays(2));
        PromotionProgram premium = program(premiumId, "gold", now.minusDays(1), now.plusDays(2));
        PromotionProgram future = program(futureId, null, now.plusDays(1), now.plusDays(2));
        when(programs.findAll()).thenReturn(List.of(open, premium, future));
        when(vouchers.findAllByOrderByCodeAsc()).thenReturn(List.of(
                voucher(openId, "ACTIVE", now.plusHours(1)),
                voucher(openId, "EXPIRED", now.minusHours(1)),
                voucher(premiumId, "GOLD", null),
                voucher(futureId, "FUTURE", null)));

        var result = service.availableFor(userId);

        assertThat(result).extracting("code").containsExactly("ACTIVE");
        assertThat(result.getFirst().endsAt()).isEqualTo(now.plusHours(1));
    }

    private PromotionProgram program(UUID id, String tier, OffsetDateTime start, OffsetDateTime end) {
        PromotionProgram program = new PromotionProgram(
                new PromotionProgramRequest("SALE", "Ưu đãi", "seasonal", tier, start, end), "SALE");
        ReflectionTestUtils.setField(program, "id", id);
        return program;
    }

    private Voucher voucher(UUID programId, String code, OffsetDateTime expiresAt) {
        return new Voucher(new VoucherRequest(programId, code, "fixed_amount", BigDecimal.TEN, expiresAt), code);
    }
}
