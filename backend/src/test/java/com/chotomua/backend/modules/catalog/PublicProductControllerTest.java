package com.chotomua.backend.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class PublicProductControllerTest {

    private ProductRepository products;
    private ProductVariantRepository variants;
    private InventoryStockRepository stocks;
    private CategoryRepository categories;
    private PublicProductController controller;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        variants = mock(ProductVariantRepository.class);
        stocks = mock(InventoryStockRepository.class);
        categories = mock(CategoryRepository.class);
        controller = new PublicProductController(products, variants, stocks, categories);
    }

    @Test
    void productDetails_returnsEveryActiveVariantWithItsAvailability() {
        UUID productId = UUID.randomUUID();
        Product product = persistedProduct(productId, "DualSense");
        ProductVariant standard = persistedVariant(product, UUID.randomUUID(), "SKU-BLACK", "1.8");
        ProductVariant purple = persistedVariant(product, UUID.randomUUID(), "SKU-PURPLE", "2.0");
        when(products.findByIdAndStatus(productId, "published")).thenReturn(Optional.of(product));
        when(variants.findByProduct_IdAndStatus(productId, "active")).thenReturn(List.of(standard, purple));
        InventoryStockRepository.VariantAvailability standardAvailability = availability(standard.getId(), 5L);
        InventoryStockRepository.VariantAvailability purpleAvailability = availability(purple.getId(), 2L);
        when(stocks.findAvailabilityByVariantIds(anyCollection()))
                .thenReturn(List.of(standardAvailability, purpleAvailability));

        PublicProductController.ProductDetails result = controller.get(productId);

        assertThat(result.variants()).hasSize(2);
        assertThat(result.variants()).extracting(PublicProductController.VariantDetails::sku)
                .containsExactly("SKU-BLACK", "SKU-PURPLE");
        assertThat(result.variants()).extracting(PublicProductController.VariantDetails::price)
                .containsExactly(new BigDecimal("1.8"), new BigDecimal("2.0"));
        assertThat(result.variants()).extracting(PublicProductController.VariantDetails::availableQuantity)
                .containsExactly(5, 2);
    }

    @Test
    void listCategoryIncludesPublishedProductsInAllDescendantCategories() {
        UUID rootId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();
        UUID grandchildId = UUID.randomUUID();
        Category child = persistedCategory(childId, "controllers");
        Category grandchild = persistedCategory(grandchildId, "ps5-controllers");
        when(categories.findByParent_Id(rootId)).thenReturn(List.of(child));
        when(categories.findByParent_Id(childId)).thenReturn(List.of(grandchild));
        when(categories.findByParent_Id(grandchildId)).thenReturn(List.of());

        Product childProduct = persistedProduct(UUID.randomUUID(), "Xbox controller");
        Product grandchildProduct = persistedProduct(UUID.randomUUID(), "DualSense");
        when(products.findPublishedProductsInCategories(anyCollection(), anyString(), anyString(), anyString(), any()))
                .thenReturn(new PageImpl<>(List.of(childProduct, grandchildProduct), PageRequest.of(0, 20), 2));
        when(variants.findByProduct_IdInAndStatus(anyCollection(), eq("active"))).thenReturn(List.of());

        PublicProductController.PageResponse<PublicProductController.ProductSummary> result =
                controller.list(rootId, null, null, null, 0, 20);

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.content()).extracting(PublicProductController.ProductSummary::name)
                .containsExactly("Xbox controller", "DualSense");
        verify(products).findPublishedProductsInCategories(eq(Set.of(rootId, childId, grandchildId)),
                eq(""), eq(""), eq(""), eq(PageRequest.of(0, 20)));
    }

    @Test
    void listWithoutCategoryKeepsAllPublishedProducts() {
        when(products.findPublishedProducts(null, "", "", "", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PublicProductController.PageResponse<PublicProductController.ProductSummary> result =
                controller.list(null, null, null, null, 0, 10);

        assertThat(result.content()).isEmpty();
        verify(products).findPublishedProducts(null, "", "", "", PageRequest.of(0, 10));
    }

    private static Product persistedProduct(UUID id, String name) {
        Product product = new Product(name);
        setId(Product.class, product, id);
        product.setStatus("published");
        product.setProductType("controller");
        return product;
    }

    private static ProductVariant persistedVariant(Product product, UUID id, String sku, String price) {
        ProductVariant variant = new ProductVariant(product, sku, new BigDecimal(price));
        setId(ProductVariant.class, variant, id);
        return variant;
    }

    private static Category persistedCategory(UUID id, String slug) {
        Category category = new Category(slug, slug);
        setId(Category.class, category, id);
        return category;
    }

    private static InventoryStockRepository.VariantAvailability availability(UUID id, Long quantity) {
        InventoryStockRepository.VariantAvailability result = mock(InventoryStockRepository.VariantAvailability.class);
        when(result.getVariantId()).thenReturn(id);
        when(result.getAvailableQuantity()).thenReturn(quantity);
        return result;
    }

    private static void setId(Class<?> type, Object entity, UUID id) {
        try {
            var field = type.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException exception) {
            throw new RuntimeException(exception);
        }
    }
}
