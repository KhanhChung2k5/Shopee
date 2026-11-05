package com.chotomua.backend.modules.order.dto;

import com.chotomua.backend.modules.order.Invoice;
import com.chotomua.backend.modules.order.OrderItem;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** One invoice with its lines (the order's lines as frozen at checkout). */
public record InvoiceResponse(
        UUID id, String invoiceNo, UUID orderId, String status,
        String buyerName, String buyerCompany, String buyerTaxCode, String buyerAddress, String buyerEmail, String buyerPhone,
        String paymentMethod,
        BigDecimal goodsAmount, BigDecimal discountAmount, BigDecimal shippingFeeAmount, BigDecimal totalAmount,
        BigDecimal vatRate, BigDecimal preTaxAmount, BigDecimal vatAmount,
        OffsetDateTime issuedAt, OffsetDateTime cancelledAt, String cancelReason, UUID replacesInvoiceId,
        List<Line> lines
) {
    public record Line(String productName, String attributes, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
    }

    public static InvoiceResponse from(Invoice i, List<OrderItem> items) {
        return new InvoiceResponse(i.getId(), i.getInvoiceNo(), i.getOrderId(), i.getStatus(),
                i.getBuyerName(), i.getBuyerCompany(), i.getBuyerTaxCode(), i.getBuyerAddress(), i.getBuyerEmail(), i.getBuyerPhone(),
                i.getPaymentMethod(), i.getGoodsAmount(), i.getDiscountAmount(), i.getShippingFeeAmount(), i.getTotalAmount(),
                i.getVatRate(), i.getPreTaxAmount(), i.getVatAmount(), i.getIssuedAt(), i.getCancelledAt(), i.getCancelReason(),
                i.getReplacesInvoiceId(),
                items.stream().map(item -> new Line(item.getProductNameSnapshot(), item.getVariantAttributesSnapshot(),
                        item.getQuantity(), item.getUnitPrice(), item.getLineTotal())).toList());
    }

    /** The valid invoice of an order (null until delivered) and the cancelled ones it replaced. */
    public record ForOrder(InvoiceResponse current, List<InvoiceResponse> cancelled) {
    }
}
