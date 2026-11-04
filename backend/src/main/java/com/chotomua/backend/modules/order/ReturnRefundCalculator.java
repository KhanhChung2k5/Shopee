package com.chotomua.backend.modules.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * What a returned line is worth: what the buyer paid for the goods still kept before the return, minus what the
 * goods kept after it cost under the same promotions.
 *
 * <p>The invoice promotion is spread over every line; the voucher only over the lines of its product types (a
 * "game discs only" voucher never discounted the controller, so returning the controller gives back its full
 * price). When what is kept falls under a promotion's minimum order, the kept goods lose that discount — the
 * buyer keeps no more than the promotion would have given that smaller order, so the difference comes off
 * the refund.</p>
 */
final class ReturnRefundCalculator {

    private ReturnRefundCalculator() {
    }

    /** One order line: its total after the SKU price, and whether the order's voucher covered it. */
    record Line(UUID itemId, BigDecimal total, boolean voucherCovers) {
    }

    /** The order's discounts at checkout; a null minimum means the promotion had none. */
    record Discounts(BigDecimal invoiceAmount, BigDecimal invoiceMinOrder,
                     BigDecimal voucherAmount, BigDecimal voucherMinOrder) {
        static final Discounts NONE = new Discounts(BigDecimal.ZERO, null, BigDecimal.ZERO, null);
    }

    /**
     * {@code amount} is the refund; {@code lostDiscount} the part of it withheld because the goods kept no longer
     * reach a minimum order (0 when nothing was withheld).
     */
    record Result(BigDecimal amount, BigDecimal lostDiscount) {
    }

    static Result refund(List<Line> lines, Collection<UUID> alreadyReturned, UUID returning, Discounts discounts) {
        Set<UUID> gone = Set.copyOf(alreadyReturned);
        List<Line> before = lines.stream().filter(l -> !gone.contains(l.itemId())).toList();
        List<Line> after = before.stream().filter(l -> !l.itemId().equals(returning)).toList();
        BigDecimal all = sum(lines, false);
        BigDecimal allCovered = sum(lines, true);

        BigDecimal amount = cost(before, all, allCovered, discounts, true)
                .subtract(cost(after, all, allCovered, discounts, true)).max(BigDecimal.ZERO);
        BigDecimal proportional = cost(before, all, allCovered, discounts, false)
                .subtract(cost(after, all, allCovered, discounts, false)).max(BigDecimal.ZERO);
        return new Result(amount, proportional.subtract(amount).max(BigDecimal.ZERO));
    }

    /** What these lines cost the buyer: their totals minus their share of each discount still earned. */
    private static BigDecimal cost(List<Line> kept, BigDecimal all, BigDecimal allCovered, Discounts d,
                                   boolean honourMinimums) {
        BigDecimal goods = sum(kept, false);
        BigDecimal covered = sum(kept, true);
        BigDecimal invoice = share(d.invoiceAmount(), goods, all,
                honourMinimums && below(goods, d.invoiceMinOrder()));
        BigDecimal voucher = share(d.voucherAmount(), covered, allCovered,
                honourMinimums && below(covered, d.voucherMinOrder()));
        return goods.subtract(invoice).subtract(voucher);
    }

    private static BigDecimal share(BigDecimal discount, BigDecimal part, BigDecimal whole, boolean lost) {
        if (lost || discount == null || discount.signum() <= 0 || whole.signum() <= 0 || part.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return discount.multiply(part).divide(whole, 0, RoundingMode.HALF_UP);
    }

    private static boolean below(BigDecimal amount, BigDecimal minimum) {
        return minimum != null && amount.compareTo(minimum) < 0;
    }

    private static BigDecimal sum(List<Line> lines, boolean coveredOnly) {
        return lines.stream()
                .filter(l -> !coveredOnly || l.voucherCovers())
                .map(Line::total)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
