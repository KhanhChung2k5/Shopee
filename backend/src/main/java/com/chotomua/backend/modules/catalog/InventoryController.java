package com.chotomua.backend.modules.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/inventory")
public class InventoryController {

    private final InventoryStockRepository stocks;
    private final InventoryMovementRepository movements;
    private final ProductVariantRepository variants;
    private final WarehouseRepository warehouses;
    private final InventoryStockService inventoryStockService;

    public InventoryController(InventoryStockRepository stocks, InventoryMovementRepository movements,
                               ProductVariantRepository variants, WarehouseRepository warehouses,
                               InventoryStockService inventoryStockService) {
        this.stocks = stocks;
        this.movements = movements;
        this.variants = variants;
        this.warehouses = warehouses;
        this.inventoryStockService = inventoryStockService;
    }

    @GetMapping("/stocks")
    @Transactional(readOnly = true)
    public List<StockResponse> listStocks(@RequestParam(required = false) UUID warehouseId,
                                          @RequestParam(required = false) UUID variantId) {
        List<InventoryStock> result;
        if (warehouseId != null && variantId != null) {
            result = stocks.findStockByVariantAndWarehouse(variantId, warehouseId).stream().toList();
        } else if (warehouseId != null) {
            result = stocks.findByWarehouse_Id(warehouseId);
        } else if (variantId != null) {
            result = stocks.findByVariant_Id(variantId);
        } else {
            result = stocks.findAll();
        }
        return result.stream().map(StockResponse::from).toList();
    }

    @PutMapping("/stocks/{variantId}/{warehouseId}")
    @Transactional
    public StockResponse setStock(@PathVariable UUID variantId, @PathVariable UUID warehouseId,
                                  @Valid @RequestBody SetStockRequest request) {
        ProductVariant variant = variants.findById(variantId)
                .orElseThrow(() -> new CatalogNotFoundException("Product variant not found: " + variantId));
        Warehouse warehouse = warehouses.findById(warehouseId)
                .orElseThrow(() -> new CatalogNotFoundException("Warehouse not found: " + warehouseId));
        InventoryStock stock = stocks.findByVariant_IdAndWarehouse_Id(variantId, warehouseId)
                .orElseGet(() -> new InventoryStock(variant, warehouse));
        if (request.quantity() < stock.getReservedQuantity()) {
            throw new IllegalArgumentException("Quantity cannot be less than the reserved quantity.");
        }

        int change = Math.subtractExact(request.quantity(), stock.getQuantity());
        stock.setQuantity(request.quantity());
        InventoryStock savedStock = stocks.save(stock);
        if (change != 0) {
            InventoryMovement movement = new InventoryMovement(savedStock, "adjust", change);
            movements.save(movement);
        }
        return StockResponse.from(savedStock);
    }

    @PostMapping("/exports")
    @Transactional
    public StockResponse exportStock(@Valid @RequestBody ExportStockRequest request) {
        ProductVariant variant = variants.findById(request.variantId())
                .orElseThrow(() -> new CatalogNotFoundException("Product variant not found: " + request.variantId()));
        Warehouse warehouse = warehouses.findById(request.warehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Warehouse not found: " + request.warehouseId()));
        InventoryStock updated = inventoryStockService.exportStock(warehouse.getId(),
                new InventoryStockService.ExportLine(variant.getId(), request.quantity()));
        return StockResponse.from(updated);
    }

    @GetMapping("/stocks/{stockId}/movements")
    @Transactional(readOnly = true)
    public List<MovementResponse> movements(@PathVariable UUID stockId) {
        if (!stocks.existsById(stockId)) {
            throw new CatalogNotFoundException("Inventory stock not found: " + stockId);
        }
        return movements.findByStock_IdOrderByOccurredAtDesc(stockId).stream()
                .map(MovementResponse::from).toList();
    }

    public record SetStockRequest(@NotNull @PositiveOrZero Integer quantity) {
    }

    public record ExportStockRequest(@NotNull UUID variantId, @NotNull UUID warehouseId,
                                     @NotNull @Positive Integer quantity) {
    }

    public record StockResponse(UUID id, UUID variantId, String sku, UUID warehouseId, String warehouseName,
                                int quantity, int reservedQuantity, int availableQuantity) {
        static StockResponse from(InventoryStock stock) {
            return new StockResponse(stock.getId(), stock.getVariant().getId(), stock.getVariant().getSku(),
                    stock.getWarehouse().getId(), stock.getWarehouse().getName(), stock.getQuantity(),
                    stock.getReservedQuantity(), stock.getQuantity() - stock.getReservedQuantity());
        }
    }

    public record MovementResponse(UUID id, UUID stockId, UUID variantId, String sku, UUID warehouseId,
                                   String type, int quantity, UUID orderId, UUID goodsReceiptId,
                                   OffsetDateTime occurredAt) {
        static MovementResponse from(InventoryMovement movement) {
            InventoryStock stock = movement.getStock();
            return new MovementResponse(movement.getId(), stock.getId(), stock.getVariant().getId(),
                    stock.getVariant().getSku(), stock.getWarehouse().getId(), movement.getType(),
                    movement.getQuantity(), movement.getOrderId(), movement.getGoodsReceiptId(),
                    movement.getOccurredAt());
        }
    }
}
