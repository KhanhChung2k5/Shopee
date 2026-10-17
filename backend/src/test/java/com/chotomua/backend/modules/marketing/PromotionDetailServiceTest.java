package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PromotionDetailServiceTest {

    private final PromotionProgramRepository programs = mock(PromotionProgramRepository.class);
    private final PromotionProductDetailRepository products = mock(PromotionProductDetailRepository.class);
    private final PromotionInvoiceDetailRepository invoices = mock(PromotionInvoiceDetailRepository.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private PromotionDetailService service;
    private final UUID programId = UUID.randomUUID();
    private final UUID variantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new PromotionDetailService(programs, products, invoices, entityManager);
    }

    @Test
    void createFlashSale_checksVariantAndStartsWithZeroSold() {
        Query query = mock(Query.class);
        when(programs.existsById(programId)).thenReturn(true);
        when(entityManager.createNativeQuery("select price from product_variants where id = :id")).thenReturn(query);
        when(query.setParameter("id", variantId)).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(new BigDecimal("150000.00")));
        when(products.save(any(PromotionProductDetail.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.createProductDiscount(new ProductDiscountRequest(
                programId, variantId, null, new BigDecimal("99000.00"), 10));

        assertThat(result.flashPrice()).isEqualByComparingTo("99000.00");
        assertThat(result.limitQty()).isEqualTo(10);
        assertThat(result.soldQty()).isZero();
    }

    @Test
    void createFlashSale_rejectsPriceThatIsNotARealDiscount() {
        Query query = mock(Query.class);
        when(programs.existsById(programId)).thenReturn(true);
        when(entityManager.createNativeQuery("select price from product_variants where id = :id")).thenReturn(query);
        when(query.setParameter("id", variantId)).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(new BigDecimal("100000.00")));

        assertThatThrownBy(() -> service.createProductDiscount(new ProductDiscountRequest(
                programId, variantId, null, new BigDecimal("100000.00"), 10)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("thấp hơn");
        verify(products, never()).save(any());
    }

    @Test
    void createProductDiscount_rejectsConflictingOrIncompleteMechanisms() {
        assertThatThrownBy(() -> service.createProductDiscount(new ProductDiscountRequest(
                programId, variantId, BigDecimal.TEN, BigDecimal.ONE, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.createProductDiscount(new ProductDiscountRequest(
                programId, variantId, null, BigDecimal.ONE, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("giới hạn");
        verify(products, never()).save(any());
    }

    @Test
    void createInvoiceDiscount_acceptsOnlyOneMechanism() {
        when(programs.existsById(programId)).thenReturn(true);
        when(invoices.save(any(PromotionInvoiceDetail.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.createInvoiceDiscount(new InvoiceDiscountRequest(programId, null, new BigDecimal("5.50")));
        assertThat(result.discountPercent()).isEqualByComparingTo("5.50");

        assertThatThrownBy(() -> service.createInvoiceDiscount(new InvoiceDiscountRequest(
                programId, BigDecimal.TEN, BigDecimal.ONE)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
