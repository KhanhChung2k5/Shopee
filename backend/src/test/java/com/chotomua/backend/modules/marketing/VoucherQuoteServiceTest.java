package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VoucherQuoteServiceTest {

    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final UUID userId = UUID.randomUUID();
    private final UUID programId = UUID.randomUUID();
    private VoucherQuoteService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new VoucherQuoteService(vouchers, programs, users);
        user = new User("buyer", "hash");
        when(users.findById(userId)).thenReturn(Optional.of(user));
        OffsetDateTime now = OffsetDateTime.now();
        when(programs.findById(programId)).thenReturn(Optional.of(new PromotionProgram(
                new PromotionProgramRequest("SALE", "Sale", "seasonal", null,
                        now.minusDays(1), now.plusDays(1)), "SALE")));
    }

    @Test
    void quote_capsFixedDiscountAtSubtotal() {
        when(vouchers.findByCodeIgnoreCase("SAVE"))
                .thenReturn(Optional.of(voucher("fixed_amount", "150.00", null)));

        var quote = service.quote(userId, new VoucherQuoteRequest("save", new BigDecimal("100.00")));

        assertThat(quote.discountAmount()).isEqualByComparingTo("100.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    void quote_calculatesPercentageWithTwoDecimalRounding() {
        when(vouchers.findByCodeIgnoreCase("SAVE"))
                .thenReturn(Optional.of(voucher("percentage", "12.50", null)));

        var quote = service.quote(userId, new VoucherQuoteRequest("SAVE", new BigDecimal("99.99")));

        assertThat(quote.discountAmount()).isEqualByComparingTo("12.50");
        assertThat(quote.payableAmount()).isEqualByComparingTo("87.49");
    }

    @Test
    void quote_rejectsExpiredVoucher() {
        when(vouchers.findByCodeIgnoreCase("SAVE"))
                .thenReturn(Optional.of(voucher("percentage", "10", OffsetDateTime.now().minusHours(1))));

        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("SAVE", BigDecimal.TEN)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hết hạn");
    }

    private Voucher voucher(String type, String value, OffsetDateTime expiresAt) {
        return new Voucher(new VoucherRequest(programId, "SAVE", type, new BigDecimal(value), expiresAt), "SAVE");
    }
}
