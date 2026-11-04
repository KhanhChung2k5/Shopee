package com.chotomua.backend.modules.order;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads back how an order was discounted — the invoice promotion and voucher it used, their minimum orders, and
 * which lines the voucher covered — so a return can be priced the way the order was.
 */
@Component
class OrderDiscountLookup {

    private final EntityManager entityManager;

    OrderDiscountLookup(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    record Breakdown(ReturnRefundCalculator.Discounts discounts, Set<String> voucherProductTypes, boolean hasVoucher) {
        /** A voucher with no product types covers every line. */
        boolean covers(String productType) {
            return hasVoucher && (voucherProductTypes.isEmpty() || voucherProductTypes.contains(productType));
        }
    }

    @Transactional(readOnly = true)
    Breakdown forOrder(Order order) {
        BigDecimal invoiceAmount = BigDecimal.ZERO;
        BigDecimal invoiceMin = null;
        List<?> invoice = entityManager.createNativeQuery("""
                        SELECT pia.discount_amount, pid.min_order_amount
                        FROM promotion_invoice_applications pia
                        JOIN promotion_invoice_details pid ON pid.id = pia.promotion_invoice_detail_id
                        WHERE pia.order_id = :orderId
                        LIMIT 1
                        """)
                .setParameter("orderId", order.getId())
                .getResultList();
        if (!invoice.isEmpty()) {
            Object[] row = (Object[]) invoice.getFirst();
            invoiceAmount = (BigDecimal) row[0];
            invoiceMin = (BigDecimal) row[1];
        }

        List<?> voucher = entityManager.createNativeQuery("""
                        SELECT v.id, v.min_order_amount
                        FROM voucher_usages vu JOIN vouchers v ON v.id = vu.voucher_id
                        WHERE vu.order_id = :orderId
                        LIMIT 1
                        """)
                .setParameter("orderId", order.getId())
                .getResultList();
        boolean hasVoucher = !voucher.isEmpty();
        BigDecimal voucherMin = null;
        Set<String> types = new HashSet<>();
        if (hasVoucher) {
            Object[] row = (Object[]) voucher.getFirst();
            voucherMin = (BigDecimal) row[1];
            for (Object type : entityManager.createNativeQuery(
                            "SELECT jsonb_array_elements_text(target_product_types) FROM vouchers WHERE id = :id")
                    .setParameter("id", row[0])
                    .getResultList()) {
                types.add(type.toString());
            }
        }

        // What the order took off in total, less the invoice promotion = the voucher's part.
        BigDecimal orderDiscount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
        BigDecimal voucherAmount = hasVoucher ? orderDiscount.subtract(invoiceAmount).max(BigDecimal.ZERO) : BigDecimal.ZERO;
        // An order whose discount records no promotion at all (older rows) is spread over every line, as before.
        if (!hasVoucher && invoice.isEmpty() && orderDiscount.signum() > 0) {
            invoiceAmount = orderDiscount;
        }
        return new Breakdown(new ReturnRefundCalculator.Discounts(invoiceAmount, invoiceMin, voucherAmount, voucherMin),
                Set.copyOf(types), hasVoucher);
    }

    /** product_type of each line of the order, by order item id. */
    @Transactional(readOnly = true)
    Map<UUID, String> productTypes(UUID orderId) {
        List<?> rows = entityManager.createNativeQuery("""
                        SELECT oi.id, p.product_type
                        FROM order_items oi
                        JOIN product_variants pv ON pv.id = oi.variant_id
                        JOIN products p ON p.id = pv.product_id
                        WHERE oi.order_id = :orderId
                        """)
                .setParameter("orderId", orderId)
                .getResultList();
        return rows.stream().map(r -> (Object[]) r).collect(Collectors.toMap(
                r -> r[0] instanceof UUID id ? id : UUID.fromString(r[0].toString()),
                r -> r[1] == null ? "" : r[1].toString(),
                (a, b) -> a));
    }
}
