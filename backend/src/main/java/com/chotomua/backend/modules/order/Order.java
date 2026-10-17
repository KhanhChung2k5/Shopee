package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Đơn hàng — ánh xạ bảng {@code orders}.
 *
 * <p>Các trường vận chuyển ({@code warehouseId}, {@code shippingProviderName},
 * {@code trackingNo}, {@code shipmentStatus}) đã được gộp trực tiếp vào bảng
 * này từ v13, thay cho bảng {@code shipments} riêng không còn tồn tại trong schema v18.</p>
 *
 * <p>Trường {@code shippingAddressSnapshot} lưu snapshot địa chỉ tại thời điểm đặt hàng
 * để lịch sử đơn không bị thay đổi hồi tố khi {@code addresses.full_address} bị sửa.</p>
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Buyer đặt hàng — tham chiếu {@code users.id}, cross-module, lưu ID thô. */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Nhân viên xử lý/xuất hóa đơn — {@code null} khi khách tự đặt online,
     * được gán khi nhân viên xác nhận đóng gói.
     * Tham chiếu {@code employees.id}, cross-module, lưu ID thô.
     */
    @Column(name = "employee_id")
    private UUID employeeId;

    /** Địa chỉ giao hàng — tham chiếu {@code addresses.id}. */
    @Column(name = "address_id", nullable = false)
    private UUID addressId;

    /**
     * Snapshot {@code addresses.full_address} tại thời điểm đặt hàng.
     * Bảo vệ lịch sử đơn khỏi bị đổi hồi tố.
     */
    @Column(name = "shipping_address_snapshot", nullable = false, length = 500)
    private String shippingAddressSnapshot;

    @Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "shipping_fee_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFeeAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    /**
     * Trạng thái đơn hàng: {@code pending | confirmed | shipping | delivered | cancelled}.
     * Mọi thay đổi trạng thái phải được ghi vào {@link OrderStatusHistory}.
     */
    @Column(nullable = false, length = 20)
    private String status = "pending";

    /**
     * Kho xuất hàng — gộp từ bảng {@code shipments} (v13).
     * {@code null} cho tới khi nhân viên kho xác nhận đóng gói.
     * Tham chiếu {@code warehouses.id}, cross-module, lưu ID thô.
     */
    @Column(name = "warehouse_id")
    private UUID warehouseId;

    /**
     * Tên đơn vị vận chuyển — gộp từ {@code shipments} (v13) và
     * {@code shipping_providers} (v16). Không tách bảng riêng.
     */
    @Column(name = "shipping_provider_name")
    private String shippingProviderName;

    /** Mã vận đơn — gộp từ bảng {@code shipments} (v13). */
    @Column(name = "tracking_no", length = 100)
    private String trackingNo;

    /**
     * Trạng thái vận chuyển: {@code pending | packed | shipping | delivered}.
     * Gộp từ bảng {@code shipments} (v13). Không còn bảng ShipmentTracking riêng.
     */
    @Column(name = "shipment_status", nullable = false, length = 20)
    private String shipmentStatus = "pending";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Order() {
    }

    public Order(UUID userId, UUID addressId, String shippingAddressSnapshot,
                 BigDecimal subtotalAmount, BigDecimal discountAmount,
                 BigDecimal shippingFeeAmount, BigDecimal totalAmount) {
        this.userId = userId;
        this.addressId = addressId;
        this.shippingAddressSnapshot = shippingAddressSnapshot;
        this.subtotalAmount = subtotalAmount;
        this.discountAmount = discountAmount;
        this.shippingFeeAmount = shippingFeeAmount;
        this.totalAmount = totalAmount;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public UUID getAddressId() {
        return addressId;
    }

    public String getShippingAddressSnapshot() {
        return shippingAddressSnapshot;
    }

    public BigDecimal getSubtotalAmount() {
        return subtotalAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getShippingFeeAmount() {
        return shippingFeeAmount;
    }

    public void setShippingFeeAmount(BigDecimal shippingFeeAmount) {
        this.shippingFeeAmount = shippingFeeAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getWarehouseId() {
        return warehouseId;
    }

    public void setWarehouseId(UUID warehouseId) {
        this.warehouseId = warehouseId;
    }

    public String getShippingProviderName() {
        return shippingProviderName;
    }

    public void setShippingProviderName(String shippingProviderName) {
        this.shippingProviderName = shippingProviderName;
    }

    public String getTrackingNo() {
        return trackingNo;
    }

    public void setTrackingNo(String trackingNo) {
        this.trackingNo = trackingNo;
    }

    public String getShipmentStatus() {
        return shipmentStatus;
    }

    public void setShipmentStatus(String shipmentStatus) {
        this.shipmentStatus = shipmentStatus;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
