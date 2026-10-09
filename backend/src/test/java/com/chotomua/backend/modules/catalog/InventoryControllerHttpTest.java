package com.chotomua.backend.modules.catalog;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class InventoryControllerHttpTest {

    private ProductVariantRepository variants;
    private WarehouseRepository warehouses;
    private InventoryStockService inventoryStockService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        InventoryStockRepository stocks = mock(InventoryStockRepository.class);
        InventoryMovementRepository movements = mock(InventoryMovementRepository.class);
        variants = mock(ProductVariantRepository.class);
        warehouses = mock(WarehouseRepository.class);
        inventoryStockService = mock(InventoryStockService.class);
        InventoryController controller = new InventoryController(stocks, movements, variants, warehouses,
                inventoryStockService);
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void postExport_returnsUpdatedOnHandAndAvailableStock() throws Exception {
        UUID variantId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        ProductVariant variant = new ProductVariant(new Product("DualSense"), "SKU-DS-01", BigDecimal.ONE);
        setId(ProductVariant.class, variant, variantId);
        Warehouse warehouse = new Warehouse("Kho chính");
        setId(Warehouse.class, warehouse, warehouseId);
        InventoryStock updated = new InventoryStock(variant, warehouse);
        updated.setQuantity(7);
        updated.setReservedQuantity(2);
        when(variants.findById(variantId)).thenReturn(Optional.of(variant));
        when(warehouses.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(inventoryStockService.exportStock(warehouseId,
                new InventoryStockService.ExportLine(variantId, 3))).thenReturn(updated);

        mvc.perform(post("/api/catalog/inventory/exports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variantId\":\"" + variantId + "\",\"warehouseId\":\""
                                + warehouseId + "\",\"quantity\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("SKU-DS-01"))
                .andExpect(jsonPath("$.quantity").value(7))
                .andExpect(jsonPath("$.reservedQuantity").value(2))
                .andExpect(jsonPath("$.availableQuantity").value(5));
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
