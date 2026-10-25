package com.chotomua.backend.modules.catalog;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
            throw new IllegalArgumentException("Cần có phiếu nhập, kho và ít nhất một dòng nhập.");
        }

        for (ImportLine line : lines) {
            if (line.variant() == null || line.variant().getId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Mỗi dòng nhập kho cần có biến thể và số lượng lớn hơn 0.");
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
            throw new IllegalArgumentException("Cần chọn kho và dòng xuất kho.");
        }
        return subtractStock(null, warehouseId, line);
    }

    /**
     * Puts back whatever an order still holds out of stock — used when a packed order is cancelled or
     * re-packed from another warehouse. Nets the order's movements per stock row, so calling it twice
     * (or on an order that was never packed) changes nothing.
     */
    @Transactional
    public void returnForOrder(UUID orderId) {
        if (orderId == null) {
            throw new IllegalArgumentException("Thiếu đơn hàng.");
        }
        Map<UUID, InventoryStock> stockById = new LinkedHashMap<>();
        Map<UUID, Integer> outstanding = new LinkedHashMap<>();
        for (InventoryMovement movement : movements.findByOrderId(orderId)) {
            InventoryStock stock = movement.getStock();
            stockById.putIfAbsent(stock.getId(), stock);
            outstanding.merge(stock.getId(), movement.getQuantity(), Integer::sum);
        }
        outstanding.forEach((stockId, net) -> {
            if (net >= 0) {
                return;
            }
            InventoryStock stock = stockById.get(stockId);
            stock.setQuantity(Math.addExact(stock.getQuantity(), -net));
            InventoryStock savedStock = stocks.save(stock);
            InventoryMovement movement = new InventoryMovement(savedStock, "adjust", -net);
            movement.setOrderId(orderId);
            movements.save(movement);
        });
    }

    /** Takes an order's lines out of the chosen warehouse when it is packed (OrderService.updateShippingInfo). */
    @Transactional
    public void exportForOrder(UUID orderId, UUID warehouseId, List<ExportLine> lines) {
        if (orderId == null || warehouseId == null || lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("Cần có đơn hàng, kho và ít nhất một dòng xuất kho.");
        }

        for (ExportLine line : lines) {
            if (line.variantId() == null || line.quantity() == null || line.quantity() <= 0) {
                throw new IllegalArgumentException("Mỗi dòng xuất kho cần có biến thể và số lượng lớn hơn 0.");
            }
            subtractStock(orderId, warehouseId, line);
        }
    }

    private InventoryStock subtractStock(UUID orderId, UUID warehouseId, ExportLine line) {
        if (line.variantId() == null || line.quantity() == null || line.quantity() <= 0) {
            throw new IllegalArgumentException("Mỗi dòng xuất kho cần có biến thể và số lượng lớn hơn 0.");
        }
        InventoryStock stock = stocks.findByVariant_IdAndWarehouse_Id(line.variantId(), warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Chưa có tồn kho cho biến thể " + line.variantId()));
        int available = stock.getQuantity() - stock.getReservedQuantity();
        if (available < line.quantity()) {
            throw new IllegalArgumentException("Không đủ hàng khả dụng cho biến thể " + line.variantId());
        }
        if (orderId == null) requireNotHeld(line.variantId(), line.quantity());

        stock.setQuantity(stock.getQuantity() - line.quantity());
        InventoryStock savedStock = stocks.save(stock);
        InventoryMovement movement = new InventoryMovement(savedStock, "export", -line.quantity());
        movement.setOrderId(orderId);
        movements.save(movement);
        return savedStock;
    }

    /**
     * A manual export or downward adjustment may not eat into units already promised to open orders —
     * otherwise those orders could not be packed. (Packing an order itself uses its own held units.)
     */
    public void requireNotHeld(UUID variantId, int decrease) {
        if (decrease <= 0) return;
        long held = stocks.countHeldByOpenOrders(variantId);
        long onHand = stocks.countOnHand(variantId);
        if (onHand - decrease < held) {
            throw new IllegalArgumentException("Không thể giảm " + decrease + " sản phẩm: " + held
                    + " sản phẩm đang được giữ cho đơn chưa đóng gói, tổng tồn chỉ còn " + onHand + ".");
        }
    }

    public record ExportLine(UUID variantId, Integer quantity) {
    }

    public record ImportLine(ProductVariant variant, Integer quantity) {
    }
}
