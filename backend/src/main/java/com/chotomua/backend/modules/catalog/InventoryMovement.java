package com.chotomua.backend.modules.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Audit record for stock imported, exported, or manually adjusted. */
@Entity
@Table(name = "inventory_movements")
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_id", nullable = false)
    private InventoryStock stock;

    // Keep these as IDs until the order and goods receipt entities are implemented.
    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "goods_receipt_id")
    private UUID goodsReceiptId;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false)
    private Integer quantity;

    @CreationTimestamp
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private OffsetDateTime occurredAt;

    protected InventoryMovement() {
    }

    public InventoryMovement(InventoryStock stock, String type, Integer quantity) {
        this.stock = stock;
        this.type = type;
        this.quantity = quantity;
    }

    public UUID getId() {
        return id;
    }

    public InventoryStock getStock() {
        return stock;
    }

    public void setStock(InventoryStock stock) {
        this.stock = stock;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public void setOrderId(UUID orderId) {
        this.orderId = orderId;
    }

    public UUID getGoodsReceiptId() {
        return goodsReceiptId;
    }

    public void setGoodsReceiptId(UUID goodsReceiptId) {
        this.goodsReceiptId = goodsReceiptId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }
}
