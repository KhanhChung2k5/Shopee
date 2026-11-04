package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VoucherServiceTest {

    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private VoucherService service;
    private final UUID programId = UUID.randomUUID();
    private final OffsetDateTime start = OffsetDateTime.parse("2026-10-01T10:00:00+07:00");

    @BeforeEach
    void setUp() {
        service = new VoucherService(vouchers, programs);
        when(programs.findById(programId)).thenReturn(Optional.of(new PromotionProgram(
                new PromotionProgramRequest("SALE", "Sale", "seasonal", null, start, start.plusDays(1)), "SALE")));
    }

    @Test
    void aVoucherAnOrderAlreadyUsedCannotBeDeleted() {
        VoucherUsageRepository usages = mock(VoucherUsageRepository.class);
        service.setUsages(usages);
        UUID id = UUID.randomUUID();
        Voucher voucher = new Voucher(new VoucherRequest(programId, "USED", "fixed_amount", BigDecimal.TEN, null), "USED");
        when(vouchers.findById(id)).thenReturn(Optional.of(voucher));
        when(usages.existsByVoucherId(id)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đã được dùng");
        verify(vouchers, never()).delete(any());
    }

    @Test
    void create_checksTheVoucherLimits() {
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "CAP", "fixed_amount", BigDecimal.TEN,
                null, List.of(), null, new BigDecimal("5"), null, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Giảm tối đa chỉ dùng");
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "BIG", "fixed_amount", new BigDecimal("200000"),
                null, List.of(), new BigDecimal("100000"), null, null, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("lớn hơn đơn tối thiểu");
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "ZERO", "percentage", BigDecimal.TEN,
                null, List.of(), null, null, 0, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tổng lượt dùng");
        verify(vouchers, never()).save(any());

        when(vouchers.save(any(Voucher.class))).thenAnswer(call -> call.getArgument(0));
        var ok = service.create(new VoucherRequest(programId, "OK", "percentage", BigDecimal.TEN, null, List.of(),
                new BigDecimal("300000"), new BigDecimal("50000"), 100, true));
        assertThat(ok.minOrderAmount()).isEqualByComparingTo("300000");
        assertThat(ok.maxDiscountAmount()).isEqualByComparingTo("50000");
        assertThat(ok.usageLimit()).isEqualTo(100);
        assertThat(ok.newCustomersOnly()).isTrue();
    }

    @Test
    void aUsedVoucherKeepsItsTermsButCanStillChangeItsExpiryAndUses() {
        VoucherUsageRepository usages = mock(VoucherUsageRepository.class);
        service.setUsages(usages);
        UUID id = UUID.randomUUID();
        Voucher voucher = new Voucher(new VoucherRequest(programId, "USED", "percentage", BigDecimal.TEN, null, List.of(),
                new BigDecimal("300000"), new BigDecimal("50000"), 100, false), "USED");
        when(vouchers.findById(id)).thenReturn(Optional.of(voucher));
        when(usages.existsByVoucherId(id)).thenReturn(true);

        assertThatThrownBy(() -> service.update(id, new VoucherRequest(programId, "USED", "percentage", new BigDecimal("20"),
                null, List.of(), new BigDecimal("300000"), new BigDecimal("50000"), 100, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chỉ được đổi hạn dùng và tổng lượt dùng");

        var updated = service.update(id, new VoucherRequest(programId, "used", "percentage", new BigDecimal("10.00"),
                start.plusHours(5), List.of(), new BigDecimal("300000.00"), new BigDecimal("50000"), 200, false));
        assertThat(updated.usageLimit()).isEqualTo(200);
        assertThat(updated.expiresAt()).isEqualTo(start.plusHours(5));
    }

    @Test
    void create_acceptsFixedAmountAndNormalizesCode() {
        when(vouchers.save(any(Voucher.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.create(new VoucherRequest(programId, "oct10", "fixed_amount",
                new BigDecimal("10000.00"), start.plusHours(1)));

        assertThat(result.code()).isEqualTo("OCT10");
        assertThat(result.value()).isEqualByComparingTo("10000.00");
    }

    @Test
    void create_rejectsPercentageOverOneHundredAndExpiredBeforeProgram() {
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "OVER", "percentage",
                new BigDecimal("100.01"), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("100%");
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "EARLY", "fixed_amount",
                BigDecimal.ONE, start.minusSeconds(1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hạn dùng");
        verify(vouchers, never()).save(any());
    }

    @Test
    void create_rejectsVoucherOutlivingItsProgramOrWithUnknownProductType() {
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "LATE", "fixed_amount",
                BigDecimal.ONE, start.plusDays(1).plusSeconds(1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sau ngày kết thúc");
        assertThatThrownBy(() -> service.create(new VoucherRequest(programId, "TOY", "fixed_amount",
                BigDecimal.ONE, null, List.of("game_disc", "toy"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Loại sản phẩm");
        verify(vouchers, never()).save(any());
    }

    @Test
    void create_keepsTheProductTypesItIsLimitedTo() {
        when(vouchers.save(any(Voucher.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.create(new VoucherRequest(programId, "GAMES", "percentage", BigDecimal.TEN, null,
                List.of("game_disc", "accessory", "game_disc")));

        assertThat(result.targetProductTypes()).containsExactly("game_disc", "accessory");
        assertThat(service.create(new VoucherRequest(programId, "ALL", "percentage", BigDecimal.TEN, null))
                .targetProductTypes()).isEmpty();
    }
}
