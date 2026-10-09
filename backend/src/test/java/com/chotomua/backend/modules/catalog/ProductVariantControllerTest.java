package com.chotomua.backend.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductVariantControllerTest {

    private ProductRepository products;
    private ProductVariantRepository variants;
    private ProductVariantController controller;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        variants = mock(ProductVariantRepository.class);
        controller = new ProductVariantController(variants, products);
    }

    @Test
    void createTwoVariantsForOneProduct_keepsBothDistinctPrices() {
        UUID productId = UUID.randomUUID();
        Product product = new Product("DualSense");
        setId(product, productId);
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(variants.save(any(ProductVariant.class))).thenAnswer(call -> call.getArgument(0));

        ProductVariantController.ProductVariantResponse black = controller.create(request(productId, "SKU-BLACK", "1.8"));
        ProductVariantController.ProductVariantResponse purple = controller.create(request(productId, "SKU-PURPLE", "2.1"));

        ArgumentCaptor<ProductVariant> saved = ArgumentCaptor.forClass(ProductVariant.class);
        verify(variants, times(2)).save(saved.capture());
        List<ProductVariant> savedVariants = saved.getAllValues();
        assertThat(savedVariants).extracting(ProductVariant::getProduct).containsOnly(product);
        assertThat(savedVariants).extracting(ProductVariant::getSku).containsExactly("SKU-BLACK", "SKU-PURPLE");
        assertThat(savedVariants).extracting(ProductVariant::getPrice)
                .containsExactly(new BigDecimal("1.8"), new BigDecimal("2.1"));
        assertThat(black.price()).isEqualByComparingTo("1.8");
        assertThat(purple.price()).isEqualByComparingTo("2.1");
    }

    private static ProductVariantController.ProductVariantRequest request(UUID productId, String sku, String price) {
        return new ProductVariantController.ProductVariantRequest(productId, sku, null, new BigDecimal(price),
                null, null, null);
    }

    private static void setId(Product product, UUID id) {
        try {
            var field = Product.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(product, id);
        } catch (ReflectiveOperationException exception) {
            throw new RuntimeException(exception);
        }
    }
}
