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
}
