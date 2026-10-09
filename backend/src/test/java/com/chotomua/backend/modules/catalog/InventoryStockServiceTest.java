package com.chotomua.backend.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class InventoryStockServiceTest {

    private InventoryStockRepository stocks;
    private InventoryMovementRepository movements;
    private InventoryStockService service;

    @BeforeEach
    void setUp() {
        stocks = mock(InventoryStockRepository.class);
        movements = mock(InventoryMovementRepository.class);
        service = new InventoryStockService(stocks, movements);
    }

    @Test
    void importForReceipt_createsMissingStockAndPositiveImportMovement() {
        UUID receiptId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Warehouse warehouse = persistedWarehouse(warehouseId);
        ProductVariant variant = persistedVariant(variantId);
        when(stocks.findByVariant_IdAndWarehouse_Id(variantId, warehouseId)).thenReturn(Optional.empty());
        when(stocks.save(any(InventoryStock.class))).thenAnswer(call -> call.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(call -> call.getArgument(0));

        service.importForReceipt(receiptId, warehouse, List.of(new InventoryStockService.ImportLine(variant, 7)));

        ArgumentCaptor<InventoryStock> stockCaptor = ArgumentCaptor.forClass(InventoryStock.class);
        verify(stocks).save(stockCaptor.capture());
        assertThat(stockCaptor.getValue().getQuantity()).isEqualTo(7);
        ArgumentCaptor<InventoryMovement> movementCaptor = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(movements).save(movementCaptor.capture());
        assertThat(movementCaptor.getValue().getType()).isEqualTo("import");
        assertThat(movementCaptor.getValue().getQuantity()).isEqualTo(7);
        assertThat(movementCaptor.getValue().getGoodsReceiptId()).isEqualTo(receiptId);
    }

    @Test
    void importForReceipt_addsToExistingOnHandQuantity() {
        UUID receiptId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        ProductVariant variant = persistedVariant(UUID.randomUUID());
        Warehouse warehouse = persistedWarehouse(warehouseId);
        InventoryStock stock = new InventoryStock(variant, warehouse);
        stock.setQuantity(12);
        stock.setReservedQuantity(4);
        when(stocks.findByVariant_IdAndWarehouse_Id(variant.getId(), warehouseId)).thenReturn(Optional.of(stock));
        when(stocks.save(any(InventoryStock.class))).thenAnswer(call -> call.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(call -> call.getArgument(0));

        service.importForReceipt(receiptId, warehouse, List.of(new InventoryStockService.ImportLine(variant, 3)));

        assertThat(stock.getQuantity()).isEqualTo(15);
        assertThat(stock.getReservedQuantity()).isEqualTo(4);
    }

    @Test
    void exportForOrder_subtractsStockAndRecordsNegativeMovement() {
        UUID orderId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        InventoryStock stock = stock(variantId, warehouseId, 10, 3);
        when(stocks.findByVariant_IdAndWarehouse_Id(variantId, warehouseId)).thenReturn(Optional.of(stock));
        when(stocks.save(any(InventoryStock.class))).thenAnswer(call -> call.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(call -> call.getArgument(0));

        service.exportForOrder(orderId, warehouseId, List.of(new InventoryStockService.ExportLine(variantId, 4)));

        assertThat(stock.getQuantity()).isEqualTo(6);
        assertThat(stock.getReservedQuantity()).isEqualTo(3);
        ArgumentCaptor<InventoryMovement> movementCaptor = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(movements).save(movementCaptor.capture());
        assertThat(movementCaptor.getValue().getType()).isEqualTo("export");
        assertThat(movementCaptor.getValue().getQuantity()).isEqualTo(-4);
        assertThat(movementCaptor.getValue().getOrderId()).isEqualTo(orderId);
    }

    @Test
    void exportStock_subtractsAvailableQuantityAndLeavesOrderIdEmpty() {
        UUID warehouseId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        InventoryStock stock = stock(variantId, warehouseId, 10, 3);
        when(stocks.findByVariant_IdAndWarehouse_Id(variantId, warehouseId)).thenReturn(Optional.of(stock));
        when(stocks.save(any(InventoryStock.class))).thenAnswer(call -> call.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(call -> call.getArgument(0));

        InventoryStock result = service.exportStock(warehouseId,
                new InventoryStockService.ExportLine(variantId, 2));

        assertThat(result.getQuantity()).isEqualTo(8);
        assertThat(result.getReservedQuantity()).isEqualTo(3);
        ArgumentCaptor<InventoryMovement> movementCaptor = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(movements).save(movementCaptor.capture());
        assertThat(movementCaptor.getValue().getType()).isEqualTo("export");
        assertThat(movementCaptor.getValue().getQuantity()).isEqualTo(-2);
        assertThat(movementCaptor.getValue().getOrderId()).isNull();
    }

    @Test
    void exportForOrder_rejectsInsufficientAvailableStockWithoutWriting() {
        UUID warehouseId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        InventoryStock stock = stock(variantId, warehouseId, 5, 4);
        when(stocks.findByVariant_IdAndWarehouse_Id(variantId, warehouseId)).thenReturn(Optional.of(stock));

        assertThatThrownBy(() -> service.exportForOrder(UUID.randomUUID(), warehouseId,
                List.of(new InventoryStockService.ExportLine(variantId, 2))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Insufficient available stock");

        assertThat(stock.getQuantity()).isEqualTo(5);
        verify(stocks, never()).save(any(InventoryStock.class));
        verify(movements, never()).save(any(InventoryMovement.class));
    }

    @Test
    void importForReceipt_rejectsOverflowBeforeChangingStock() {
        UUID receiptId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        ProductVariant variant = persistedVariant(UUID.randomUUID());
        Warehouse warehouse = persistedWarehouse(warehouseId);
        InventoryStock stock = new InventoryStock(variant, warehouse);
        stock.setQuantity(Integer.MAX_VALUE);
        when(stocks.findByVariant_IdAndWarehouse_Id(variant.getId(), warehouseId)).thenReturn(Optional.of(stock));

        assertThatThrownBy(() -> service.importForReceipt(receiptId, warehouse,
                List.of(new InventoryStockService.ImportLine(variant, 1))))
                .isInstanceOf(ArithmeticException.class);

        assertThat(stock.getQuantity()).isEqualTo(Integer.MAX_VALUE);
        verify(stocks, never()).save(any(InventoryStock.class));
        verify(movements, never()).save(any(InventoryMovement.class));
    }

    private static InventoryStock stock(UUID variantId, UUID warehouseId, int quantity, int reserved) {
        ProductVariant variant = persistedVariant(variantId);
        Warehouse warehouse = persistedWarehouse(warehouseId);
        InventoryStock stock = new InventoryStock(variant, warehouse);
        stock.setQuantity(quantity);
        stock.setReservedQuantity(reserved);
        return stock;
    }

    private static ProductVariant persistedVariant(UUID id) {
        ProductVariant variant = new ProductVariant(new Product("test product"), "SKU-TEST", BigDecimal.ONE);
        setId(ProductVariant.class, variant, id);
        return variant;
    }

    private static Warehouse persistedWarehouse(UUID id) {
        Warehouse warehouse = new Warehouse("test warehouse");
        setId(Warehouse.class, warehouse, id);
        return warehouse;
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
