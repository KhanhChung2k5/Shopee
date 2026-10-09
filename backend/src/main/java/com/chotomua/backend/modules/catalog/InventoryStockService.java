package com.chotomua.backend.modules.catalog;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Inventory operations shared by receipt approval and the order-confirmation flow. */
@Service
public class InventoryStockService {

    private final InventoryStockRepository stocks;
    private final InventoryMovementRepository movements;

    public InventoryStockService(InventoryStockRepository stocks, InventoryMovementRepository movements) {
        this.stocks = stocks;
        this.movements = movements;
    }

    /** Adds goods-receipt lines and their audit rows in the receipt approval transaction. */
    @Transactional
    public void importForReceipt(UUID receiptId, Warehouse warehouse, List<ImportLine> lines) {
        if (receiptId == null || warehouse == null || warehouse.getId() == null || lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("A receipt, warehouse, and at least one import line are required.");
        }

        for (ImportLine line : lines) {
            if (line.variant() == null || line.variant().getId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Each import line requires a variant and positive quantity.");
            }
            InventoryStock stock = stocks.findByVariant_IdAndWarehouse_Id(line.variant().getId(), warehouse.getId())
                    .orElseGet(() -> new InventoryStock(line.variant(), warehouse));
            int newQuantity = Math.addExact(stock.getQuantity(), line.quantity());
            stock.setQuantity(newQuantity);
            InventoryStock savedStock = stocks.save(stock);
            InventoryMovement movement = new InventoryMovement(savedStock, "import", line.quantity());
            movement.setGoodsReceiptId(receiptId);
            movements.save(movement);
        }
    }

    /** Export stock explicitly, for manual warehouse operations. */
    @Transactional
    public InventoryStock exportStock(UUID warehouseId, ExportLine line) {
        if (warehouseId == null || line == null) {
            throw new IllegalArgumentException("A warehouse and export line are required.");
        }
        return subtractStock(null, warehouseId, line);
    }

    /** Called inside the order-confirmation transaction once the order module is wired. */
    @Transactional
    public void exportForOrder(UUID orderId, UUID warehouseId, List<ExportLine> lines) {
        if (orderId == null || warehouseId == null || lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("An order, warehouse, and at least one export line are required.");
        }

        for (ExportLine line : lines) {
            if (line.variantId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Each export line requires a variant and positive quantity.");
            }
            subtractStock(orderId, warehouseId, line);
        }
    }

    private InventoryStock subtractStock(UUID orderId, UUID warehouseId, ExportLine line) {
        if (line.variantId() == null || line.quantity() == null || line.quantity() <= 0) {
            throw new IllegalArgumentException("Each export line requires a variant and positive quantity.");
        }
        InventoryStock stock = stocks.findByVariant_IdAndWarehouse_Id(line.variantId(), warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("No stock exists for variant " + line.variantId()));
        int available = stock.getQuantity() - stock.getReservedQuantity();
        if (available < line.quantity()) {
            throw new IllegalArgumentException("Insufficient available stock for variant " + line.variantId());
        }

        stock.setQuantity(stock.getQuantity() - line.quantity());
        InventoryStock savedStock = stocks.save(stock);
        InventoryMovement movement = new InventoryMovement(savedStock, "export", -line.quantity());
        movement.setOrderId(orderId);
        movements.save(movement);
        return savedStock;
    }

    public record ExportLine(UUID variantId, Integer quantity) {
    }

    public record ImportLine(ProductVariant variant, Integer quantity) {
    }
}
