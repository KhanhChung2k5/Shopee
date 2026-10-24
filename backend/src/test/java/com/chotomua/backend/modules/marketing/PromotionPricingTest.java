package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.order.ProductVariantSnapshot;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Tier 1 (SKU price: flash > % off) and tier 2 (best invoice discount), honouring dates and loyalty tiers. */
class PromotionPricingTest {

    private final PromotionProductDetailRepository details = mock(PromotionProductDetailRepository.class);
    private final PromotionInvoiceDetailRepository invoiceDetails = mock(PromotionInvoiceDetailRepository.class);
    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final FlashSaleCheckoutService skuPricing = new FlashSaleCheckoutService(details, programs, users);
    private final InvoicePromotionService invoicePricing = new InvoicePromotionService(invoiceDetails, programs, users);
    private final UUID buyerId = UUID.randomUUID();
    private final UUID variantId = UUID.randomUUID();
    private final ProductVariantSnapshot base = new ProductVariantSnapshot(variantId, new BigDecimal("1000000.00"), "Đĩa", "{}");

    private void buyerTier(String tier) {
        User buyer = new User("buyer", "x");
        buyer.setLoyaltyTier(tier);
        when(users.findById(buyerId)).thenReturn(Optional.of(buyer));
    }

    @Test
    void percentDiscountPricesTheLineWhenThereIsNoFlashSale() {
        buyerTier("bronze");
        PromotionProgram sale = program(null, 1);
        PromotionProductDetail tenOff = detail(sale, new BigDecimal("10"), null, null);
        PromotionProductDetail fifteenOff = detail(sale, new BigDecimal("15"), null, null);
        when(details.readByVariantId(variantId)).thenReturn(List.of(tenOff, fifteenOff));

        ProductVariantSnapshot priced = skuPricing.apply(buyerId, variantId, 2, base, false);

        assertThat(priced.unitPrice()).isEqualByComparingTo("850000"); // best % wins
        assertThat(priced.promotion().flash()).isFalse();
        assertThat(priced.promotion().listPrice()).isEqualByComparingTo("1000000");
    }

    @Test
    void flashBeatsPercentAndPreviewDoesNotUseUpTheQuota() {
        buyerTier("bronze");
        PromotionProgram sale = program(null, 1);
        PromotionProductDetail flash = detail(sale, null, new BigDecimal("700000"), 5);
        PromotionProductDetail percent = detail(sale, new BigDecimal("50"), null, null);
        when(details.readByVariantId(variantId)).thenReturn(List.of(flash, percent));
        when(details.findByVariantId(variantId)).thenReturn(List.of(flash, percent));

        assertThat(skuPricing.apply(buyerId, variantId, 2, base, false).unitPrice()).isEqualByComparingTo("700000");
        assertThat(flash.getSoldQty()).isZero();

        skuPricing.apply(buyerId, variantId, 2, base, true);
        assertThat(flash.getSoldQty()).isEqualTo(2);

        when(details.findById(flash.getId())).thenReturn(Optional.of(flash));
        skuPricing.releaseFlash(flash.getId(), 2); // order cancelled
        assertThat(flash.getSoldQty()).isZero();
    }

    @Test
    void tierOnlyAndExpiredProgramsAreIgnored() {
        buyerTier("silver");
        PromotionProductDetail goldOnly = detail(program("gold", 1), new BigDecimal("30"), null, null);
        PromotionProductDetail ended = detail(program(null, -1), new BigDecimal("40"), null, null);
        when(details.readByVariantId(variantId)).thenReturn(List.of(goldOnly, ended));

        assertThat(skuPricing.apply(buyerId, variantId, 1, base, false)).isSameAs(base);

        buyerTier("diamond");
        assertThat(skuPricing.apply(buyerId, variantId, 1, base, false).unitPrice()).isEqualByComparingTo("700000");
    }

    @Test
    void bestInvoiceDiscountIsPickedAndCappedAtTheSubtotal() {
        buyerTier(null);
        PromotionProgram sale = program(null, 1);
        PromotionProgram vip = program("gold", 1);
        when(programs.findAll()).thenReturn(List.of(sale, vip));
        when(invoiceDetails.findAllByOrderByPromotionProgramIdAsc()).thenReturn(List.of(
                invoice(sale, new BigDecimal("50000"), null),
                invoice(sale, null, new BigDecimal("10")),        // 10% of 2.000.000 = 200.000 — best for this buyer
                invoice(vip, new BigDecimal("900000"), null)));   // gold only

        var best = invoicePricing.best(buyerId, new BigDecimal("2000000")).orElseThrow();
        assertThat(best.amount()).isEqualByComparingTo("200000");

        var capped = invoicePricing.best(buyerId, new BigDecimal("30000")).orElseThrow();
        assertThat(capped.amount()).isEqualByComparingTo("30000");
        verify(users, never()).save(any());
    }

    private PromotionProgram program(String tier, int daysLeft) {
        OffsetDateTime now = OffsetDateTime.now();
        PromotionProgram program = new PromotionProgram(new PromotionProgramRequest("P" + UUID.randomUUID().toString().substring(0, 6),
                "CT", "seasonal", tier, now.minusDays(2), now.plusDays(daysLeft)), "P");
        ReflectionTestUtils.setField(program, "id", UUID.randomUUID());
        when(programs.findById(program.getId())).thenReturn(Optional.of(program));
        return program;
    }

    private PromotionProductDetail detail(PromotionProgram program, BigDecimal percent, BigDecimal flashPrice, Integer limit) {
        PromotionProductDetail detail = new PromotionProductDetail(new ProductDiscountRequest(program.getId(), variantId, percent, flashPrice, limit));
        ReflectionTestUtils.setField(detail, "id", UUID.randomUUID());
        return detail;
    }

    private PromotionInvoiceDetail invoice(PromotionProgram program, BigDecimal amount, BigDecimal percent) {
        PromotionInvoiceDetail detail = new PromotionInvoiceDetail(new InvoiceDiscountRequest(program.getId(), amount, percent));
        ReflectionTestUtils.setField(detail, "id", UUID.randomUUID());
        return detail;
    }
}
