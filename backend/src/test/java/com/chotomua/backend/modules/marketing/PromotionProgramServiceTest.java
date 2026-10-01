package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PromotionProgramServiceTest {

    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final VoucherRepository vouchers = mock(VoucherRepository.class);
    private PromotionProgramService service;
    private final OffsetDateTime start = OffsetDateTime.parse("2026-10-01T10:00:00+07:00");

    @BeforeEach
    void setUp() {
        service = new PromotionProgramService(programs, vouchers);
    }

    @Test
    void create_normalizesCodeAndRejectsDuplicate() {
        PromotionProgramRequest request = new PromotionProgramRequest("oct_sale", "Tháng 10", "seasonal", null,
                start, start.plusDays(1));
        when(programs.save(any(PromotionProgram.class))).thenAnswer(call -> call.getArgument(0));

        assertThat(service.create(request).code()).isEqualTo("OCT_SALE");
        when(programs.findByCodeIgnoreCase("OCT_SALE"))
                .thenReturn(Optional.of(new PromotionProgram(request, "OCT_SALE")));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tồn tại");
    }

    @Test
    void create_rejectsEndBeforeStartWithoutWriting() {
        PromotionProgramRequest request = new PromotionProgramRequest("SALE", "Sale", "seasonal", null,
                start, start.minusMinutes(1));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("kết thúc");
        verify(programs, never()).save(any());
    }

    @Test
    void delete_rejectsProgramThatStillOwnsVouchers() {
        UUID id = UUID.randomUUID();
        PromotionProgram program = new PromotionProgram(new PromotionProgramRequest("SALE", "Sale", "seasonal", null,
                start, start.plusDays(1)), "SALE");
        when(programs.findById(id)).thenReturn(Optional.of(program));
        when(vouchers.existsByPromotionProgramId(id)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("voucher");
        verify(programs, never()).delete(any());
    }
}
