package com.chotomua.backend.modules.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A sales invoice of one order (see V15__invoices.sql). Never edited once issued: it is cancelled and replaced. */
@Entity
@Table(name = "invoices")
public class Invoice {

    public static final String ISSUED = "issued";
    public static final String CANCELLED = "cancelled";
    /** Selling prices include VAT at this rate. */
    public static final BigDecimal VAT_RATE = new BigDecimal("10");

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "invoice_no", nullable = false, unique = true, length = 30)
    private String invoiceNo;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(nullable = false, length = 20)
    private String status = ISSUED;
    @Column(name = "buyer_name", nullable = false)
    private String buyerName;
    @Column(name = "buyer_company")
    private String buyerCompany;
    @Column(name = "buyer_tax_code", length = 20)
    private String buyerTaxCode;
    @Column(name = "buyer_address", length = 500)
    private String buyerAddress;
    @Column(name = "buyer_email")
    private String buyerEmail;
    @Column(name = "buyer_phone", length = 20)
    private String buyerPhone;
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;
    @Column(name = "goods_amount", nullable = false)
    private BigDecimal goodsAmount;
    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount;
    @Column(name = "shipping_fee_amount", nullable = false)
    private BigDecimal shippingFeeAmount;
    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;
    @Column(name = "vat_rate", nullable = false)
    private BigDecimal vatRate;
    @Column(name = "pre_tax_amount", nullable = false)
    private BigDecimal preTaxAmount;
    @Column(name = "vat_amount", nullable = false)
    private BigDecimal vatAmount;
    @Column(name = "issued_at", nullable = false)
    private OffsetDateTime issuedAt = OffsetDateTime.now();
    @Column(name = "issued_by")
    private UUID issuedBy;
    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;
    @Column(name = "cancelled_by")
    private UUID cancelledBy;
    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;
    @Column(name = "replaces_invoice_id")
    private UUID replacesInvoiceId;

    protected Invoice() {
    }

    /** The order's amounts, with the tax inside the total split out (whole đồng). */
    Invoice(String invoiceNo, Order order, Buyer buyer, String paymentMethod, UUID issuedBy, UUID replacesInvoiceId) {
        this.invoiceNo = invoiceNo;
        this.orderId = order.getId();
        this.buyerName = buyer.name();
        this.buyerCompany = buyer.company();
        this.buyerTaxCode = buyer.taxCode();
        this.buyerAddress = buyer.address();
        this.buyerEmail = buyer.email();
        this.buyerPhone = buyer.phone();
        this.paymentMethod = paymentMethod;
        this.goodsAmount = zeroIfNull(order.getSubtotalAmount());
        this.discountAmount = zeroIfNull(order.getDiscountAmount());
        this.shippingFeeAmount = zeroIfNull(order.getShippingFeeAmount());
        this.totalAmount = zeroIfNull(order.getTotalAmount());
        this.vatRate = VAT_RATE;
        this.preTaxAmount = totalAmount.multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(100).add(VAT_RATE), 0, RoundingMode.HALF_UP);
        this.vatAmount = totalAmount.subtract(preTaxAmount);
        this.issuedBy = issuedBy;
        this.replacesInvoiceId = replacesInvoiceId;
    }

    /** Who the invoice is made out to. */
    public record Buyer(String name, String company, String taxCode, String address, String email, String phone) {
    }

    void cancel(UUID employeeId, String reason) {
        if (!ISSUED.equals(status)) throw new IllegalStateException("Hoá đơn đã bị huỷ trước đó");
        this.status = CANCELLED;
        this.cancelledAt = OffsetDateTime.now();
        this.cancelledBy = employeeId;
        this.cancelReason = reason;
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    public UUID getId() { return id; }
    public String getInvoiceNo() { return invoiceNo; }
    public UUID getOrderId() { return orderId; }
    public String getStatus() { return status; }
    public String getBuyerName() { return buyerName; }
    public String getBuyerCompany() { return buyerCompany; }
    public String getBuyerTaxCode() { return buyerTaxCode; }
    public String getBuyerAddress() { return buyerAddress; }
    public String getBuyerEmail() { return buyerEmail; }
    public String getBuyerPhone() { return buyerPhone; }
    public String getPaymentMethod() { return paymentMethod; }
    public BigDecimal getGoodsAmount() { return goodsAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getShippingFeeAmount() { return shippingFeeAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public BigDecimal getVatRate() { return vatRate; }
    public BigDecimal getPreTaxAmount() { return preTaxAmount; }
    public BigDecimal getVatAmount() { return vatAmount; }
    public OffsetDateTime getIssuedAt() { return issuedAt; }
    public UUID getIssuedBy() { return issuedBy; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public String getCancelReason() { return cancelReason; }
    public UUID getReplacesInvoiceId() { return replacesInvoiceId; }
}
