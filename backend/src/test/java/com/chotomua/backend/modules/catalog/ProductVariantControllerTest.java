package com.chotomua.backend.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
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

        ProductVariantController.ProductVariantResponse black = controller.create(request(productId, "PS5-CTL-DS-BLACK", "1.8"));
        ProductVariantController.ProductVariantResponse purple = controller.create(request(productId, "PS5-CTL-DS-PURPLE", "2.1"));

        ArgumentCaptor<ProductVariant> saved = ArgumentCaptor.forClass(ProductVariant.class);
        verify(variants, times(2)).save(saved.capture());
        List<ProductVariant> savedVariants = saved.getAllValues();
        assertThat(savedVariants).extracting(ProductVariant::getProduct).containsOnly(product);
        assertThat(savedVariants).extracting(ProductVariant::getSku).containsExactly("PS5-CTL-DS-BLACK", "PS5-CTL-DS-PURPLE");
        assertThat(savedVariants).extracting(ProductVariant::getPrice)
                .containsExactly(new BigDecimal("1.8"), new BigDecimal("2.1"));
        assertThat(black.price()).isEqualByComparingTo("1.8");
        assertThat(purple.price()).isEqualByComparingTo("2.1");
    }

    @Test
    void skuIsStoredUpperCaseAndMustBeUnique() {
        UUID productId = UUID.randomUUID();
        Product product = new Product("Đĩa PS5 Spider-Man 2");
        setId(product, productId);
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(variants.save(any(ProductVariant.class))).thenAnswer(call -> call.getArgument(0));

        var created = controller.create(request(productId, " ps5-game-spiderman2 ", "1"));
        assertThat(created.sku()).isEqualTo("PS5-GAME-SPIDERMAN2");
        assertThat(created.productName()).isEqualTo("Đĩa PS5 Spider-Man 2");

        when(variants.existsBySkuIgnoreCase("PS5-GAME-ASTRO-BOT")).thenReturn(true);
        assertThatThrownBy(() -> controller.create(request(productId, "ps5-game-astro-bot", "1")))
                .hasMessageContaining("đã được dùng");
        verify(variants, times(1)).save(any(ProductVariant.class));
    }

    @Test
    void skuMustFollowPlatformKindItemConvention() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        UUID productId = UUID.randomUUID();
        assertThat(validator.validate(request(productId, "PS5-CTL-DS-EDGE", "1"))).isEmpty();
        assertThat(validator.validate(request(productId, "SAMPLE-D9", "1"))).isNotEmpty();
        assertThat(validator.validate(request(productId, "PS5 GAME ASTRO", "1"))).isNotEmpty();
        verify(variants, never()).save(any(ProductVariant.class));
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
