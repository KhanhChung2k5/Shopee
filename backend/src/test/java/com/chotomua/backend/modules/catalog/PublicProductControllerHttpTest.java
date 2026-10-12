package com.chotomua.backend.modules.catalog;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PublicProductControllerHttpTest {

    private ProductRepository products;
    private ProductVariantRepository variants;
    private CategoryRepository categories;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        variants = mock(ProductVariantRepository.class);
        categories = mock(CategoryRepository.class);
        InventoryStockRepository stocks = mock(InventoryStockRepository.class);
        PublicProductController controller = new PublicProductController(products, variants, stocks, categories);
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getProductsByParentCategory_returnsProductsFromChildCategories() throws Exception {
        UUID rootId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();
        Category child = new Category("Tay cầm", "tay-cam");
        setId(Category.class, child, childId);
        Product childProduct = new Product("DualSense");
        setId(Product.class, childProduct, UUID.randomUUID());
        childProduct.setStatus("published");
        childProduct.setCategory(child);
        when(categories.findByParent_Id(rootId)).thenReturn(List.of(child));
        when(categories.findByParent_Id(childId)).thenReturn(List.of());
        when(products.findPublishedProductsInCategories(anyCollection(), anyString(), anyString(), anyString(), any()))
                .thenReturn(new PageImpl<>(List.of(childProduct), PageRequest.of(0, 12), 1));
        when(variants.findByProduct_IdInAndStatus(anyCollection(), eq("active"))).thenReturn(List.of());

        mvc.perform(get("/api/products")
                        .param("categoryId", rootId.toString())
                        .param("page", "0")
                        .param("size", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("DualSense"))
                .andExpect(jsonPath("$.content[0].categoryId").value(childId.toString()));
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
