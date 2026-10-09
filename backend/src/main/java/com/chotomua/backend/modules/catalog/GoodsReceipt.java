package com.chotomua.backend.modules.catalog;

import com.chotomua.backend.modules.identity.Employee;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "goods_receipts")
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @CreationTimestamp
    @Column(name = "received_at", nullable = false, updatable = false)
    private OffsetDateTime receivedAt;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GoodsReceiptItem> items = new ArrayList<>();

    protected GoodsReceipt() {
    }

    public GoodsReceipt(String code, Employee employee, Warehouse warehouse, String supplierName) {
        this.code = code;
        this.employee = employee;
        this.warehouse = warehouse;
        this.supplierName = supplierName;
    }

    public void addItem(GoodsReceiptItem item) {
        items.add(item);
        item.setReceipt(this);
    }

    public void setStatus(String status) { this.status = status; }
    public UUID getId() { return id; }
    public String getCode() { return code; }
    public Employee getEmployee() { return employee; }
    public Warehouse getWarehouse() { return warehouse; }
    public String getSupplierName() { return supplierName; }
    public String getStatus() { return status; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public List<GoodsReceiptItem> getItems() { return items; }
}
