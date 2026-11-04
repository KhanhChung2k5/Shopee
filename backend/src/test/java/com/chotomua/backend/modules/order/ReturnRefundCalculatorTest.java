package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;

import com.chotomua.backend.modules.order.ReturnRefundCalculator.Discounts;
import com.chotomua.backend.modules.order.ReturnRefundCalculator.Line;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ReturnRefundCalculatorTest {

    private final UUID disc = UUID.randomUUID();
    private final UUID controller = UUID.randomUUID();
    private final UUID secondDisc = UUID.randomUUID();

    private static BigDecimal vnd(String amount) {
        return new BigDecimal(amount);
    }

    @Test
    void aVoucherForGameDiscsIsNotTakenOutOfTheControllerRefund() {
        // 1.000.000 disc + 1.000.000 controller, 100.000 voucher on game discs only.
        List<Line> lines = List.of(new Line(disc, vnd("1000000"), true), new Line(controller, vnd("1000000"), false));
        Discounts discounts = new Discounts(BigDecimal.ZERO, null, vnd("100000"), null);

        assertThat(ReturnRefundCalculator.refund(lines, List.of(), controller, discounts).amount())
                .isEqualByComparingTo("1000000");                    // was 950.000 when spread over both lines
        assertThat(ReturnRefundCalculator.refund(lines, List.of(), disc, discounts).amount())
                .isEqualByComparingTo("900000");
    }

    @Test
    void theInvoicePromotionIsStillSpreadOverEveryLine() {
        List<Line> lines = List.of(new Line(disc, vnd("600000"), false), new Line(controller, vnd("400000"), false));
        Discounts discounts = new Discounts(vnd("100000"), null, BigDecimal.ZERO, null);

        assertThat(ReturnRefundCalculator.refund(lines, List.of(), disc, discounts).amount()).isEqualByComparingTo("540000");
        assertThat(ReturnRefundCalculator.refund(lines, List.of(), controller, discounts).amount()).isEqualByComparingTo("360000");
    }

    @Test
    void keepingLessThanTheVoucherMinimumGivesThatVoucherBackOutOfTheRefund() {
        // Voucher 50.000 for orders from 450.000: 400.000 disc + 100.000 controller qualify together.
        List<Line> lines = List.of(new Line(disc, vnd("400000"), true), new Line(controller, vnd("100000"), true));
        Discounts discounts = new Discounts(BigDecimal.ZERO, null, vnd("50000"), vnd("450000"));

        var result = ReturnRefundCalculator.refund(lines, List.of(), controller, discounts);

        // Paid 450.000; the disc kept alone would cost its full 400.000 → 50.000 back, not 90.000.
        assertThat(result.amount()).isEqualByComparingTo("50000");
        assertThat(result.lostDiscount()).isEqualByComparingTo("40000");
    }

    @Test
    void returningEveryLineRefundsExactlyWhatWasPaid() {
        List<Line> lines = List.of(new Line(disc, vnd("333333"), true), new Line(controller, vnd("333333"), false),
                new Line(secondDisc, vnd("333334"), true));
        Discounts discounts = new Discounts(vnd("77777"), vnd("500000"), vnd("55555"), vnd("400000"));

        BigDecimal first = ReturnRefundCalculator.refund(lines, List.of(), controller, discounts).amount();
        BigDecimal second = ReturnRefundCalculator.refund(lines, List.of(controller), disc, discounts).amount();
        BigDecimal third = ReturnRefundCalculator.refund(lines, List.of(controller, disc), secondDisc, discounts).amount();

        BigDecimal paid = vnd("1000000").subtract(vnd("77777")).subtract(vnd("55555"));
        assertThat(first.add(second).add(third)).isEqualByComparingTo(paid);
    }

    @Test
    void anOrderWithoutDiscountRefundsTheLineTotal() {
        List<Line> lines = List.of(new Line(disc, vnd("250000"), false), new Line(controller, vnd("750000"), false));

        var result = ReturnRefundCalculator.refund(lines, List.of(), disc, Discounts.NONE);

        assertThat(result.amount()).isEqualByComparingTo("250000");
        assertThat(result.lostDiscount()).isEqualByComparingTo("0");
    }
}
