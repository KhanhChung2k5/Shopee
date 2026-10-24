package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VoucherQuoteServiceTest {

    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final VoucherUsageRepository usages = mock(VoucherUsageRepository.class);
    private final UUID userId = UUID.randomUUID();
    private final UUID programId = UUID.randomUUID();
    private VoucherQuoteService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new VoucherQuoteService(vouchers, programs, users, usages);
        user = new User("buyer", "hash");
        when(users.findById(userId)).thenReturn(Optional.of(user));
        programFor(null);
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

    @Test
    void quote_discountsOnlyTheLinesOfTheVoucherProductTypes() {
        when(vouchers.findByCodeIgnoreCase("DISC10"))
                .thenReturn(Optional.of(voucher("percentage", "10", null, List.of("game_disc"))));

        var quote = service.quote(userId, new VoucherQuoteRequest("DISC10", new BigDecimal("3000000"), List.of(
                new VoucherQuoteRequest.Item("game_disc", new BigDecimal("1500000")),
                new VoucherQuoteRequest.Item("controller", new BigDecimal("1500000")))));

        assertThat(quote.eligibleSubtotal()).isEqualByComparingTo("1500000");
        assertThat(quote.discountAmount()).isEqualByComparingTo("150000");
        assertThat(quote.payableAmount()).isEqualByComparingTo("2850000");
    }

    @Test
    void quote_capsFixedDiscountAtTheEligibleLines() {
        when(vouchers.findByCodeIgnoreCase("ACC"))
                .thenReturn(Optional.of(voucher("fixed_amount", "500000", null, List.of("accessory"))));

        var quote = service.quote(userId, new VoucherQuoteRequest("ACC", new BigDecimal("2000000"), List.of(
                new VoucherQuoteRequest.Item("accessory", new BigDecimal("300000")),
                new VoucherQuoteRequest.Item("game_disc", new BigDecimal("1700000")))));

        assertThat(quote.discountAmount()).isEqualByComparingTo("300000");
    }

    @Test
    void quote_rejectsWhenTheCartHasNoProductOfTheVoucherTypes() {
        when(vouchers.findByCodeIgnoreCase("PAD"))
                .thenReturn(Optional.of(voucher("percentage", "10", null, List.of("controller"))));

        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("PAD", new BigDecimal("1500000"), List.of(
                new VoucherQuoteRequest.Item("game_disc", new BigDecimal("1500000"))))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tay cầm");
        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("PAD", new BigDecimal("1500000"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cần thông tin sản phẩm");
    }

    @Test
    void quote_allowsTheTargetTierAndAboveButNotBelow() {
        programFor("gold");
        when(vouchers.findByCodeIgnoreCase("VIP")).thenReturn(Optional.of(voucher("percentage", "10", null)));

        user.setLoyaltyTier("silver");
        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("VIP", BigDecimal.TEN)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Vàng trở lên");
        user.setLoyaltyTier(null); // not ranked yet = bronze
        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("VIP", BigDecimal.TEN)))
                .isInstanceOf(IllegalArgumentException.class);

        user.setLoyaltyTier("gold");
        assertThat(service.quote(userId, new VoucherQuoteRequest("VIP", BigDecimal.TEN)).discountAmount())
                .isEqualByComparingTo("1.00");
        user.setLoyaltyTier("diamond");
        assertThat(service.quote(userId, new VoucherQuoteRequest("VIP", BigDecimal.TEN)).discountAmount())
                .isEqualByComparingTo("1.00");
    }

    @Test
    void quote_rejectsAVoucherTheBuyerAlreadyUsed() {
        when(vouchers.findByCodeIgnoreCase("ONCE")).thenReturn(Optional.of(voucher("fixed_amount", "10", null)));
        when(usages.hasActiveUse(any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.quote(userId, new VoucherQuoteRequest("ONCE", BigDecimal.TEN)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đã sử dụng");
    }

    private void programFor(String tier) {
        OffsetDateTime now = OffsetDateTime.now();
        when(programs.findById(programId)).thenReturn(Optional.of(new PromotionProgram(
                new PromotionProgramRequest("SALE", "Sale", "seasonal", tier,
                        now.minusDays(1), now.plusDays(1)), "SALE")));
    }

    private Voucher voucher(String type, String value, OffsetDateTime expiresAt) {
        return voucher(type, value, expiresAt, List.of());
    }

    private Voucher voucher(String type, String value, OffsetDateTime expiresAt, List<String> productTypes) {
        return new Voucher(new VoucherRequest(programId, "SAVE", type, new BigDecimal(value), expiresAt, productTypes), "SAVE");
    }
}
