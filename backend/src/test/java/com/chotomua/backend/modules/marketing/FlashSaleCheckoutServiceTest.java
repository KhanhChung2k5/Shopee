package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.order.ProductVariantSnapshot;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** KAN-237: flash sale stock exhaustion must be reported, not silently sold past its limit. */
class FlashSaleCheckoutServiceTest {

    private final PromotionProductDetailRepository details = mock(PromotionProductDetailRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final FlashSaleCheckoutService service = new FlashSaleCheckoutService(details, programs);

    @Test
    void apply_throwsWhenRequestedQuantityExceedsRemainingFlashSaleLimit() {
        UUID variantId = UUID.randomUUID();
        UUID programId = UUID.randomUUID();
        PromotionProductDetail detail = activeFlashDetail(programId, variantId, "500000", 2);
        detail.reserveFlashQuantity(2); // sell out the only 2 units on offer
        when(details.findByVariantId(variantId)).thenReturn(List.of(detail));
        when(programs.findById(programId)).thenReturn(Optional.of(activeProgram(programId)));
        ProductVariantSnapshot base = new ProductVariantSnapshot(variantId, new BigDecimal("800000"), "Tay cầm", "{}");

        assertThatThrownBy(() -> service.apply(variantId, 1, base))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Flash Sale đã hết số lượng ưu đãi");
    }

    @Test
    void apply_appliesFlashPriceWhenStockIsStillAvailable() {
        UUID variantId = UUID.randomUUID();
        UUID programId = UUID.randomUUID();
        PromotionProductDetail detail = activeFlashDetail(programId, variantId, "500000", 2);
        when(details.findByVariantId(variantId)).thenReturn(List.of(detail));
        when(programs.findById(programId)).thenReturn(Optional.of(activeProgram(programId)));
        ProductVariantSnapshot base = new ProductVariantSnapshot(variantId, new BigDecimal("800000"), "Tay cầm", "{}");

        ProductVariantSnapshot result = service.apply(variantId, 1, base);

        assertThat(result.unitPrice()).isEqualByComparingTo("500000");
        assertThat(detail.getSoldQty()).isEqualTo(1);
    }

    @Test
    void apply_returnsBaseSnapshotWhenNoActiveFlashSaleMatchesTheVariant() {
        UUID variantId = UUID.randomUUID();
        when(details.findByVariantId(variantId)).thenReturn(List.of());
        ProductVariantSnapshot base = new ProductVariantSnapshot(variantId, new BigDecimal("800000"), "Tay cầm", "{}");

        ProductVariantSnapshot result = service.apply(variantId, 1, base);

        assertThat(result).isSameAs(base);
    }

    private static PromotionProductDetail activeFlashDetail(UUID programId, UUID variantId, String flashPrice, int limitQty) {
        return new PromotionProductDetail(new ProductDiscountRequest(
                programId, variantId, null, new BigDecimal(flashPrice), limitQty));
    }

    private static PromotionProgram activeProgram(UUID programId) {
        PromotionProgram program = new PromotionProgram(new PromotionProgramRequest(
                "FLASH-" + programId, "Flash Sale", "flash_sale", null,
                OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusHours(1)), "FLASH-" + programId);
        return program;
    }
}
